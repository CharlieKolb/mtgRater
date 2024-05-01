
export type Distribution = [number, number, number, number, number]

// snakecase since this matches the backend json
export type RatingSchema = {
    set_code: string,
    card_code: string,
    rated_1: number,
    rated_2: number,
    rated_3: number,
    rated_4: number,
    rated_5: number,

}

// snakecase since this matches the backend json
export type Format = {
    format_id: string;
    ratings: RatingSchema[];
}

export type CardRating = 1 | 2 | 3 | 4 | 5;

export type RatingsPostRequest = {
    formatId: string;
    rating: CardRating;
    cardCode: string;
    setCode: string;
}

export default class Backend {
    private server_url: string = "not set";

    public constructor(url: string) {
        this.server_url = url;
    }

    public async getRatings(formatId: string): Promise<Format> {
        return (await fetch(`${this.server_url}/ratings?format_id=${formatId}`))
            .json() as Promise<Format>;

    }

    public async postRating({ formatId, rating, cardCode, setCode }: RatingsPostRequest): Promise<Response> {
        return fetch(`${this.server_url}/ratings/post?format_id=${formatId}&rating=${rating}&card_code=${cardCode}&set_code=${setCode}`);
    }
}

