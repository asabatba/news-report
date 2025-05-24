// Initialize the Showdown converter once
// Ensure this is defined globally in your HTML before this script is loaded
// const converter = new showdown.Converter({ simpleLineBreaks: true });

document.addEventListener('alpine:init', () => {
    Alpine.data('newsMap', () => ({
        newsItems: [],
        topicFilter: '',
        selectedNewsIds: [],
        search: null,
        searchString: '',
        loading: true,
        error: '',
        map: null,
        markerClusterGroup: null,
        // Ensure 'converter' is accessible, typically from the global scope
        // where it's initialized in the HTML.
        converter: typeof converter !== 'undefined' ? converter : null,
        newsMarkers: {}, // Store references to markers by news ID
        newsApiUrl: 'https://wood.arsaba.dev/api/collections/newsmap/records?perPage=50&sort=-created&fields=id,link,title,content_date,location,summary,geojson,topics,created,updated&filter=geojson!=null',

        // Computed property for filtered news
        get filteredNews() {
            return this.searchString
                ? this.search.find(this.searchString).map(result => result.item)
                : this.newsItems;
        },

        doSearch() {
            if (this.search) {
                this.searchString = this.searchString.trim();
            }
        },

        init() {
            if (this.map) return; // Prevent double initialization

            // Initialize map
            this.initMap();
            // Load news data
            this.loadNews();
        },

        initMap() {
            // Initialize the map
            if (this.map) return; // Prevent re-initialization

            this.map = L.map(this.$refs.map).setView([20, 0], 2);

            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(this.map);

            // Create marker cluster group
            this.markerClusterGroup = L.markerClusterGroup({
                maxClusterRadius: 50,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: true,
                zoomToBoundsOnClick: true
            });

            // Add event listener for cluster clicks
            this.markerClusterGroup.on('clusterclick', (a) => {
                // Get all markers in this cluster
                const childMarkers = a.layer.getAllChildMarkers();
                const newsIds = childMarkers.map(marker => marker.newsId);

                // Set selected news IDs to show in side panel
                this.selectNewsItems(newsIds);
            });

            this.map.addLayer(this.markerClusterGroup);
        },

        async loadNews() {
            try {
                const response = await fetch(this.newsApiUrl);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                this.newsItems = data.items;

                this.search = new fzf.Fzf(this.newsItems, {
                    selector: (item) => `${item.title} (${(item.topics ?? []).join(', ')}) ${item.summary} ${item.location}`,
                });

                // Add markers for each news item
                this.newsItems.forEach(news => this.addNewsMarker(news));

                this.loading = false;
            } catch (error) {
                console.error('Error loading news:', error);
                this.loading = false;
                this.showError('Failed to load news data. Please try again later.');
            }
        },

        addNewsMarker(news) {
            try {
                const geoData = typeof news.geojson === 'string' ? JSON.parse(news.geojson) : news.geojson;
                const newsIcon = this.getNewsIcon();
                let marker;

                if (geoData.type === 'Point') {
                    const [lng, lat] = geoData.coordinates;
                    marker = L.marker([lat, lng], { icon: newsIcon });

                    marker.newsId = news.id;
                    marker.on('click', () => this.selectNewsItems([news.id]));

                    this.markerClusterGroup.addLayer(marker);
                    this.newsMarkers[news.id] = marker;
                } else if (geoData.type === 'Feature' && geoData.geometry.type === 'Point') {
                    const [lng, lat] = geoData.geometry.coordinates;
                    marker = L.marker([lat, lng], { icon: newsIcon });

                    marker.newsId = news.id;
                    marker.on('click', () => this.selectNewsItems([news.id]));

                    this.markerClusterGroup.addLayer(marker);
                    this.newsMarkers[news.id] = marker;
                } else if (geoData.type === 'Polygon' || (geoData.type === 'Feature' && geoData.geometry.type === 'Polygon')) {
                    const layer = L.geoJSON(geoData);
                    const bounds = layer.getBounds();
                    const center = bounds.getCenter();

                    marker = L.marker([center.lat, center.lng], { icon: newsIcon });

                    marker.newsId = news.id;
                    marker.on('click', () => this.selectNewsItems([news.id]));

                    this.markerClusterGroup.addLayer(marker);
                    this.newsMarkers[news.id] = marker;

                    layer.setStyle({
                        fillColor: '#ff7800',
                        weight: 2,
                        opacity: 0.7,
                        color: 'white',
                        fillOpacity: 0.3
                    }).addTo(this.map);
                }
            } catch (error) {
                console.error('Error parsing geojson for news item:', news.title, error);
            }
        },

        getNewsIcon() {
            return L.icon({
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });
        },

        selectNewsItems(newsIds) {
            this.selectedNewsIds = newsIds;
            this.$el.querySelector('#side').scrollTop = 0;
        },

        clearSelection() {
            this.selectedNewsIds = [];
        },

        setTopicFilter(topic) {
            this.topicFilter = topic;
            this.clearSelection();
        },

        formatDate(dateString) {
            return new Date(dateString).toLocaleDateString();
        },

        formatSummary(summary) {
            // Ensure 'converter' is available and initialized
            if (this.converter && typeof this.converter.makeHtml === 'function') {
                return this.converter.makeHtml(summary);
            }
            return summary; // Fallback if converter is not available
        },

        showError(message) {
            this.error = message;
            setTimeout(() => {
                this.error = '';
            }, 5000);
        }
    }));
});
