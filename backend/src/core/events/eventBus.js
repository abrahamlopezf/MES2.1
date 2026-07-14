const EventEmitter = require('events');

class EventBus extends EventEmitter {}

// Global EventBus instance
const eventBus = new EventBus();

// Scrap Module Events
const ScrapEvents = {
    SCRAP_GENERATED: 'SCRAP_GENERATED',
    SCRAP_TRANSFERRED: 'SCRAP_TRANSFERRED',
    SCRAP_RECYCLED: 'SCRAP_RECYCLED',
    SCRAP_CONTAINER_FULL: 'SCRAP_CONTAINER_FULL',
    SCRAP_CONTAINER_EMPTY: 'SCRAP_CONTAINER_EMPTY',
    SCRAP_LOW_CAPACITY: 'SCRAP_LOW_CAPACITY'
};

// Production Events
const ProductionEvents = {
    PRODUCTION_FINISHED: 'PRODUCTION_FINISHED'
};

module.exports = {
    eventBus,
    ScrapEvents,
    ProductionEvents
};
