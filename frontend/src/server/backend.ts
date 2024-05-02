
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
    localRating: LocalRating;
}


// snakecase since this matches the backend json
export type Format = {
    format_id: string;
    ratings: RatingSchema[];
}

export type CardRating = 1 | 2 | 3 | 4 | 5;

export type LocalRating = CardRating | null;

export type RatingsPostRequest = {
    formatId: string;
    rating: CardRating;
    cardCode: string;
    setCode: string;
}

function stringToRating(s: string | null): LocalRating {
    switch (s) {
        case "1": return 1;
        case "2": return 2;
        case "3": return 3;
        case "4": return 4;
        case "5": return 5;
        default: return null;

    }
}

function makeLocalStorageKey(formatId: string, { set_code, card_code }: Pick<RatingSchema, "card_code" | "set_code">) {
    return `cardKey_formatId-${formatId}_setCode-${set_code}_cardCode-${card_code}_localRating`;
}

function updateFromLocalStorage(formatId: string, ratings: RatingSchema[]) {
    for (let rating of ratings) {
        rating.localRating = stringToRating(localStorage.getItem(makeLocalStorageKey(formatId, rating)));
    }
    return ratings;
}

export default class Backend {
    private server_url: string = "not set";

    public constructor(url: string) {
        this.server_url = url;
    }

    public async getRatings(formatId: string): Promise<Format> {
        const response = await fetch(`${this.server_url}/ratings?format_id=${formatId}`);
        if (!response.ok) {
            return Promise.reject("getRatings response not ok");
        }

        const format = await response.json();

        format.ratings = updateFromLocalStorage(formatId, format.ratings);

        return format as Promise<Format>;

    }

    public postRating({ formatId, rating, cardCode, setCode }: RatingsPostRequest): void {
        localStorage.setItem(makeLocalStorageKey(formatId, { set_code: setCode, card_code: cardCode }), rating.toString());
        fetch(`${this.server_url}/ratings?format_id=${formatId}&rating=${rating}&card_code=${cardCode}&set_code=${setCode}`, {
            method: "POST",
        });
    }
}

