// ============================================================
// Storage Manager - Handles all localStorage operations
// ============================================================
class ExplanationStorage {
    constructor(eventBus) {
        this.eventBus = eventBus;
    }

    save(selectedTrees, traceToRegion, regions) {
        try {
            const timestamp = Date.now();
            const key = `explanation_data_${timestamp}`;

            const dataToSave = {
                selectedTrees: this._mapToObject(selectedTrees),
                traceToRegion: this._mapToObject(traceToRegion),
                regions: this._mapToObject(regions),
                timestamp: timestamp,
                savedAt: new Date().toISOString()
            };

            localStorage.setItem(key, JSON.stringify(dataToSave));

            console.log(`Successfully saved explanation data to local storage with key: ${key}`);

            if (this.eventBus) {
                this.eventBus.publish('explanationSaved', {
                    timestamp: timestamp,
                    key: key,
                    success: true
                });
            }

            return { timestamp, key, success: true };
        } catch (error) {
            console.error("Error saving to local storage:", error);

            if (this.eventBus) {
                this.eventBus.publish('explanationSaved', {
                    success: false,
                    error: error.message
                });
            }

            return { success: false, error: error.message };
        }
    }

    load(timestamp) {
        try {
            const key = `explanation_data_${timestamp}`;
            const savedData = localStorage.getItem(key);

            if (!savedData) {
                throw new Error(`No saved data found for timestamp: ${timestamp}`);
            }

            const parsedData = JSON.parse(savedData);

            console.log(`Successfully loaded explanation data from local storage with key: ${key}`);

            if (this.eventBus) {
                this.eventBus.publish('explanationLoaded', {
                    timestamp: timestamp,
                    key: key,
                    success: true
                });
            }

            return {
                success: true,
                data: {
                    selectedTrees: this._objectToMap(parsedData.selectedTrees),
                    traceToRegion: this._objectToMap(parsedData.traceToRegion),
                    regions: this._objectToMap(parsedData.regions)
                }
            };
        } catch (error) {
            console.error("Error loading from local storage:", error);

            if (this.eventBus) {
                this.eventBus.publish('explanationLoaded', {
                    success: false,
                    error: error.message
                });
            }

            return { success: false, error: error.message };
        }
    }

    getSavedExplanations() {
        try {
            const savedExplanations = [];

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);

                if (key.startsWith('explanation_data_')) {
                    try {
                        const savedData = JSON.parse(localStorage.getItem(key));
                        savedExplanations.push({
                            key: key,
                            timestamp: savedData.timestamp,
                            savedAt: savedData.savedAt,
                            treeCount: Object.keys(savedData.selectedTrees).length,
                            regionCount: Object.keys(savedData.regions).length
                        });
                    } catch (parseError) {
                        console.warn(`Could not parse data for key ${key}:`, parseError);
                    }
                }
            }

            return savedExplanations.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            console.error("Error getting saved explanations:", error);
            return [];
        }
    }

    delete(timestamp) {
        try {
            const key = `explanation_data_${timestamp}`;

            if (!localStorage.getItem(key)) {
                throw new Error(`No saved data found for timestamp: ${timestamp}`);
            }

            localStorage.removeItem(key);
            console.log(`Successfully deleted explanation data with key: ${key}`);

            if (this.eventBus) {
                this.eventBus.publish('explanationDeleted', {
                    timestamp: timestamp,
                    key: key,
                    success: true
                });
            }

            return { success: true };
        } catch (error) {
            console.error("Error deleting saved explanation:", error);

            if (this.eventBus) {
                this.eventBus.publish('explanationDeleted', {
                    success: false,
                    error: error.message
                });
            }

            return { success: false, error: error.message };
        }
    }

    _mapToObject(map) {
        const obj = {};
        for (const [key, value] of map.entries()) {
            obj[key] = value;
        }
        return obj;
    }

    _objectToMap(obj) {
        const map = new Map();
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                map.set(key, obj[key]);
            }
        }
        return map;
    }
}

export { ExplanationStorage };