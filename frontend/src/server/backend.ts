
export type Distribution = [number, number, number, number, number]

export type Rating = {
    rated_1: number,
    rated_2: number,
    rated_3: number,
    rated_4: number,
    rated_5: number,
    localRating: LocalRating,
}

export type RatingByFormat = Record<string, Rating>;

// snakecase since this matches the backend json
export type Card = {
    set_code: string,
    card_code: string,
    rating_by_format: RatingByFormat;
}


// snakecase since this matches the backend json
export type Collection = {
    collection_id: string;
    ratings: Card[];
}

export type CardRating = 1 | 2 | 3 | 4 | 5;

export type LocalRating = CardRating | null;

export type RatingsPostRequest = {
    collectionId: string;
    formatId: string;
    rating: CardRating;
    cardCode: string;
    setCode: string;
}

export type CollectionInfo = {
    title: string;
    scryfall_query: string;
    set_order?: string[];
}

export type Collections = {
    formats: string[];
    entries: Record<string, CollectionInfo>;
    latest: string;
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

function makeLocalStorageKey(collectionId: string, formatId: string, { set_code, card_code }: Pick<Card, "set_code" | "card_code">) {
    return `cardKey_collectionId-${collectionId}_formatId-${formatId}_setCode-${set_code}_cardCode-${card_code}_localRating`;
}

function updateFromLocalStorage(collectionId: string, ratings: Card[]) {
    for (let schema of ratings) {
        for (let [formatId, rating] of Object.entries(schema.rating_by_format)) {
            rating.localRating = stringToRating(localStorage.getItem(makeLocalStorageKey(collectionId, formatId, schema)));
        }
    }
    return ratings;
}

export function setLocalStorageRating(collectionId: string, formatId: string, setCode: string, cardCode: string, rating: LocalRating) {
    if (rating === null) {
        localStorage.removeItem(makeLocalStorageKey(collectionId, formatId, { set_code: setCode, card_code: cardCode }));
    }
    else {
        localStorage.setItem(makeLocalStorageKey(collectionId, formatId, { set_code: setCode, card_code: cardCode }), rating.toString());
    }
}

export default class Backend {
    private server_url: string = "not set";

    public constructor(url: string) {
        this.server_url = url;
    }

    public async getRatings(collectionId: string): Promise<Collection> {
        const response = await fetch(`${this.server_url}/ratings?collection_id=${collectionId}`);
        if (!response.ok) {
            return Promise.reject("getRatings response not ok");
        }
        const collection = await response.json() as Collection;

        updateFromLocalStorage(collectionId, collection.ratings);

        return collection;

    }

    public postRating({ collectionId, formatId, rating, cardCode, setCode }: RatingsPostRequest): void {
        setLocalStorageRating(collectionId, formatId, setCode, cardCode, rating);
        fetch(`${this.server_url}/ratings?collection_id=${collectionId}&rating=${rating}&card_code=${cardCode}&set_code=${setCode}&format_id=${formatId}`, {
            method: "POST",
        });
    }

    public async getCollections(): Promise<Collections> {
        return (await fetch(`${this.server_url}/collections`)).json() as Promise<Collections>;
    }
}

