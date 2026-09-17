const MistralClient = require('../js/MistralClient.js');
const storageManager = require('../js/StorageManager.js').storageManager;

describe('MistralClient.parseResult', () => {
    let client;

    beforeEach(() => {
        client = new MistralClient(storageManager);
        storageManager.saveApiKey('test-key');
        storageManager.saveSettings({ model: 'pixtral-12b-2409' });
    });

    test('parses valid JSON content', () => {
        const result = client.parseResult('{"systolic":137,"diastolic":88,"pulse":72,"confidence":0.95}');
        expect(result.systolic).toBe(137);
        expect(result.diastolic).toBe(88);
        expect(result.pulse).toBe(72);
        expect(result.confidence).toBeCloseTo(0.95, 2);
    });

    test('extracts JSON from surrounding text', () => {
        const result = client.parseResult('Hier das Ergebnis: {"systolic":120,"diastolic":80,"pulse":65,"confidence":0.8} Ende');
        expect(result.systolic).toBe(120);
        expect(result.diastolic).toBe(80);
    });

    test('converts unreadable values to null', () => {
        const result = client.parseResult('{"systolic":null,"diastolic":"??","pulse":72,"confidence":0.5}');
        expect(result.systolic).toBeNull();
        expect(result.diastolic).toBeNull();
        expect(result.pulse).toBe(72);
    });

    test('clamps confidence to 0-1 range', () => {
        const result = client.parseResult('{"systolic":130,"diastolic":85,"pulse":70,"confidence":3}');
        expect(result.confidence).toBe(1);
    });

    test('throws when content is not valid JSON', () => {
        expect(() => client.parseResult('kein json hier')).toThrow();
    });
});

describe('MistralClient.analyzeImage', () => {
    let client;

    beforeEach(() => {
        client = new MistralClient(storageManager);
    });

    test('throws when no api key configured', async () => {
        storageManager.saveApiKey('');
        await expect(client.analyzeImage('data:image/jpeg;base64,abc')).rejects.toThrow('API-Key');
    });

    test('sends request and returns parsed result', async () => {
        storageManager.saveApiKey('test-key');
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: '{"systolic":137,"diastolic":88,"pulse":72,"confidence":0.9}' } }]
            })
        });

        const result = await client.analyzeImage('data:image/jpeg;base64,abc');
        expect(result.systolic).toBe(137);
        expect(global.fetch).toHaveBeenCalledTimes(1);

        const callArgs = global.fetch.mock.calls[0];
        expect(callArgs[0]).toContain('api.mistral.ai');
        expect(callArgs[1].headers.Authorization).toBe('Bearer test-key');
        expect(callArgs[1].body).toContain('pixtral');
    });

    test('throws on 401 response', async () => {
        storageManager.saveApiKey('wrong-key');
        global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });
        await expect(client.analyzeImage('data:image/jpeg;base64,abc')).rejects.toThrow('401');
    });

    test('throws when response has no content', async () => {
        storageManager.saveApiKey('test-key');
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ choices: [] })
        });
        await expect(client.analyzeImage('data:image/jpeg;base64,abc')).rejects.toThrow();
    });
});