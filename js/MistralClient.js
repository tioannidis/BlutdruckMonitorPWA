class MistralClient {
    constructor(storage) {
        this.storage = storage || (typeof storageManager !== 'undefined' ? storageManager : null);
        this.apiUrl = 'https://api.mistral.ai/v1/chat/completions';
        this.baseModel = 'pixtral-12b-2409';
    }

    getApiKey() {
        if (this.storage) {
            return this.storage.loadApiKey();
        }
        return '';
    }

    getModel() {
        if (this.storage) {
            const settings = this.storage.loadSettings();
            return settings.model || this.baseModel;
        }
        return this.baseModel;
    }

    hasApiKey() {
        return this.getApiKey().trim().length > 0;
    }

    /**
     * Load an image file, downscale it and return a compact JPEG data URL.
     * @param {File|Blob} file
     * @param {number} maxSize
     * @returns {Promise<string>}
     */
    prepareImage(file, maxSize) {
        maxSize = maxSize || 1200;
        return new Promise((resolve, reject) => {
            if (typeof FileReader === 'undefined') {
                reject(new Error('FileReader nicht verfügbar'));
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;
                    const scale = Math.min(1, maxSize / Math.max(width, height));
                    if (scale < 1) {
                        width = Math.round(width * scale);
                        height = Math.round(height * scale);
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.onerror = () => reject(new Error('Bild konnte nicht geladen werden'));
                img.src = reader.result;
            };
            reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Analyze an image (File/Blob or data URL) and extract blood pressure values.
     * @param {File|Blob|string} input
     * @returns {Promise<{systolic:number|null, diastolic:number|null, pulse:number|null, confidence:number}>}
     */
    async analyzeImage(input) {
        const apiKey = this.getApiKey();
        if (!apiKey.trim()) {
            throw new Error('Kein Mistral API-Key hinterlegt');
        }

        let imageDataUrl = input;
        if (typeof input !== 'string') {
            imageDataUrl = await this.prepareImage(input);
        }

        const model = this.getModel();
        const systemPrompt =
            'Du bist ein medizinischer Assistent, der Blutdruckmessgeräte-Fotos analysiert. ' +
            'Lies die Werte auf dem Display ab: systolischer Druck (SYS), diastolischer Druck (DIA) und Puls. ' +
            'Antworte ausschließlich mit einem JSON-Objekt im Format ' +
            '{"systolic":<Zahl|null>,"diastolic":<Zahl|null>,"pulse":<Zahl|null>,"confidence":<0-1>}. ' +
            'Wenn ein Wert nicht lesbar ist, setze ihn auf null. confidence beschreibt deine Sicherheit der gesamten Ablesung. ' +
            'Keine Erklärungen, nur das JSON-Objekt.';

        const body = {
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'Analysiere dieses Foto eines Blutdruckmessgeräts und extrahiere die Werte als JSON.'
                        },
                        { type: 'image_url', image_url: imageDataUrl }
                    ]
                }
            ],
            response_format: { type: 'json_object' }
        };

        let response;
        try {
            response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiKey.trim()
                },
                body: JSON.stringify(body)
            });
        } catch (e) {
            throw new Error('Netzwerkfehler bei Mistral API: ' + e.message);
        }

        if (!response.ok) {
            const status = response.status;
            if (status === 401) {
                throw new Error('Ungültiger Mistral API-Key (401)');
            }
            if (status === 429) {
                throw new Error('Zu viele Anfragen an Mistral (429)');
            }
            throw new Error('Mistral API Fehler: ' + status);
        }

        let data;
        try {
            data = await response.json();
        } catch (e) {
            throw new Error('Ungültige Antwort von Mistral API');
        }

        const content = data && data.choices && data.choices[0]
            ? data.choices[0].message && data.choices[0].message.content
            : null;

        if (!content) {
            throw new Error('Mistral API: keine Antwort-Inhalte');
        }

        return this.parseResult(content);
    }

    /**
     * Parse and validate the model response into a structured result.
     * @param {string} content
     * @returns {{systolic:number|null, diastolic:number|null, pulse:number|null, confidence:number}}
     */
    parseResult(content) {
        let parsed = null;
        if (typeof content === 'string') {
            const match = content.match(/\{[\s\S]*\}/);
            if (match) {
                try {
                    parsed = JSON.parse(match[0]);
                } catch (e) {
                    parsed = null;
                }
            }
        } else if (typeof content === 'object' && content !== null) {
            parsed = content;
        }

        if (!parsed || typeof parsed !== 'object') {
            throw new Error('Mistral API: Antwort konnte nicht als JSON geparst werden');
        }

        const toIntOrNull = (val) => {
            const n = Number(val);
            return Number.isInteger(n) && n > 0 ? n : null;
        };
        const toConfidence = (val) => {
            const n = Number(val);
            if (Number.isFinite(n)) {
                return Math.max(0, Math.min(1, n));
            }
            return 0;
        };

        return {
            systolic: toIntOrNull(parsed.systolic),
            diastolic: toIntOrNull(parsed.diastolic),
            pulse: toIntOrNull(parsed.pulse),
            confidence: toConfidence(parsed.confidence)
        };
    }
}

const mistralClient = new MistralClient();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MistralClient;
}