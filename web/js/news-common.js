// Initialize a single global Showdown converter instance
// Ensure showdown.js is loaded before this script
const globalConverter = (typeof showdown !== 'undefined') ? new showdown.Converter({ simpleLineBreaks: true }) : null;
if (!globalConverter) {
    console.error("Showdown library not loaded before news-common.js. Markdown conversion will fail.");
}

async function fetchNewsSummaries() {
    const response = await fetch('https://wood.arsaba.dev/api/collections/news_summaries/records?sort=-created');
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

function getUpdateTimeInfo() {
    // Ensure dayjs is loaded globally
    if (typeof dayjs === 'undefined') {
        console.error("dayjs is not loaded");
        return { timeUntilNext: "dayjs not loaded", until8: "dayjs not loaded" };
    }
    const now = dayjs();
    let nextUpdate = now.hour() < 8 ? now.hour(8).minute(0).second(0) : now.add(1, 'day').hour(8).minute(0).second(0);
    const diff = nextUpdate.diff(now);
    const duration = dayjs.duration(diff);

    // Format for "timeUntilNext"
    let timeUntilNextFormatted = "";
    if (duration.hours() > 0) {
        timeUntilNextFormatted += `${duration.hours()}h `;
    }
    if (duration.minutes() > 0) {
        timeUntilNextFormatted += `${duration.minutes()}m `;
    }
    timeUntilNextFormatted += `${duration.seconds()}s`;


    // Format for "until8" (more precise)
    const until8Formatted = `${String(duration.hours()).padStart(2, '0')}:${String(duration.minutes()).padStart(2, '0')}:${String(duration.seconds()).padStart(2, '0')}`;

    return {
        timeUntilNext: timeUntilNextFormatted.trim(),
        until8: until8Formatted
    };
}

// Function to initialize and update time info periodically
function initializeAndUpdateTimeInfo(alpineInstance) {
    const update = () => {
        const timeInfo = getUpdateTimeInfo();
        alpineInstance.timeUntilNext = timeInfo.timeUntilNext;
        alpineInstance.until8 = timeInfo.until8;
    };
    update(); // Initial call
    setInterval(update, 1000); // Update every second
}
