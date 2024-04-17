
export type Distribution = [number, number, number, number, number]


function randomInt(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default new class MockBackend {
    public async getDistribution(setCode: string, cardCode: number): Promise<Distribution> {
        return [
            randomInt(10, 50),
            randomInt(15, 70),
            randomInt(15, 70),
            randomInt(15, 70),
            randomInt(10, 50),
        ];

    }

    public async registerRating(setCode: string, cardCode: number, rating: number | null): Promise<Distribution> {

        await new Promise(resolve => setTimeout(resolve, randomInt(50, 3000)));


        return this.getDistribution(setCode, cardCode);
    }
}()

