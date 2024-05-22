import { ScryfallCard } from "@scryfall/api-types";
import { ProgramStore } from "../util/programStore";

export type Distribution = [number, number, number, number, number]


export const EMPTY_RATING = {
    rated_1: 0,
    rated_2: 0,
    rated_3: 0,
    rated_4: 0,
    rated_5: 0,
    localRating: null,
}

export type Rating = {
    rated_1: number,
    rated_2: number,
    rated_3: number,
    rated_4: number,
    rated_5: number,
    localRating: LocalRating,
}

export type RatingByFormat = Record<string, Rating>;

export function hasAtLeastOneLocalRating(card: CardRating | undefined) {
    if (card === undefined) return false;

    return Object.values(card.rating_by_format).some(x => x.localRating !== null);
}


// snakecase since this matches the backend json
export type CardRating = {
    set_code: string,
    card_code: string,
    rating_by_format: RatingByFormat;
}

export type Ratings = {
    ratings: Record<string, CardRating>;
};

export type CardRatingValue = 1 | 2 | 3 | 4 | 5;

export type LocalRating = CardRatingValue | null;

export type RatingsPostRequest = {
    collectionId: string;
    formatId: string;
    rating: CardRatingValue;
    cardCode: string;
    setCode: string;
}

export type CollectionMetadata = {
    id: string,
    title: string;
    scryfall_query: string;
    set_order: string[];
    releasing?: boolean;
}

export type Format = {
    title: string;
    enabled: boolean;
}

export type Collections = {
    formats: Format[];
    entries: Record<string, CollectionMetadata>;
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

export function makeRatingsKey(card: Card) {
    return card.setCode + card.cardCode;
}

export function makeRatingsKeyJson(card: { set_code: string, card_code: string }) {
    return card.set_code + card.card_code;
}

function makeLocalStorageKey(collectionId: string, formatId: string, { set_code, card_code }: Pick<CardRating, "set_code" | "card_code">) {
    return `cardKey_collectionId-${collectionId}_formatId-${formatId}_setCode-${set_code}_cardCode-${card_code}_localRating`;
}

function updateRatingsFromLocalStorage(collectionId: string, ratings: Ratings) {
    for (const cardRating of Object.values(ratings.ratings)) {
        for (let [key, rating] of Object.entries(cardRating.rating_by_format)) {
            rating.localRating = stringToRating(ProgramStore.getItem(makeLocalStorageKey(collectionId, key, cardRating)));
        }
    }
    return ratings;
}

export function setLocalStorageRating(collectionId: string, formatId: string, setCode: string, cardCode: string, rating: LocalRating) {
    if (rating === null) {
        ProgramStore.removeItem(makeLocalStorageKey(collectionId, formatId, { set_code: setCode, card_code: cardCode }));
    }
    else {
        ProgramStore.setItem(makeLocalStorageKey(collectionId, formatId, { set_code: setCode, card_code: cardCode }), rating.toString());
    }
}

export type Card = {
    setCode: string,
    cardCode: string,
    scryfallCard: ScryfallCard.Any,

}

export type CollectionInfo = {
    metadata: CollectionMetadata,
    dict: Record<string, ScryfallCard.Any>,
    list: Card[],
}

function reorder_sets(cards: Card[], setOrder: string[]) {
    // TODO: Apply custom set order here. Happens to work out for MH3 tho so kinda low priority

    return cards;
}

async function fetchCollectionInfo(collectionMetadata: CollectionMetadata): Promise<CollectionInfo> {
    let query = "https://api.scryfall.com/cards/search?q=-is%3Adigital+" + collectionMetadata.scryfall_query + "&unique=carxds&order=set";
    let dict: Record<string, ScryfallCard.Any> = {};
    let list = [];
    do {
        const x = await (await fetch(query)).json();
        query = x.next_page;
        for (const card of (x.data as ScryfallCard.Any[])) {
            const { set, collector_number } = card;
            dict[set + collector_number] = card;
            list.push({ setCode: card.set, cardCode: card.collector_number, scryfallCard: card });
        }
    } while (query);

    list = reorder_sets(list, collectionMetadata.set_order);

    return { metadata: collectionMetadata, dict, list };
}

type CardGetJson = {
    set_code: string,
    card_code: string,
    rating_by_format: Record<string, Rating>,

}

// snakecase since this matches the backend json
type RatingsGetJson = {
    collection_id: string;
    collection_info: CollectionInfo;
    ratings: CardGetJson[];
}

function parseRatings(ratingsJson: RatingsGetJson): Ratings {
    let dict: Record<string, CardRating> = {}
    for (const rating of ratingsJson.ratings) {
        const key = makeRatingsKeyJson(rating);
        dict[key] = rating;
    }
    return { ratings: dict };
}

export function makeFormatStorageKey(formatName: string) {
    return `format${formatName}_enabled`;
}

function makeEmptyLocalRating(set_code: string, card_code: string, formats: Format[]) {
    return {
        set_code,
        card_code,
        rating_by_format: Object.fromEntries(formats.map(x => [x.title, Object.assign({
            set_code,
            card_code,
        }, EMPTY_RATING)]))
    }
}

function updateFromCollectionInfo(ratings: Ratings, collectionInfo: CollectionInfo, formats: Format[]) {
    for (const [k, v] of Object.entries(collectionInfo.dict)) {
        ratings.ratings[k] = ratings.ratings[k] || makeEmptyLocalRating(v.set, v.collector_number, formats);
    }
}

export default class Backend {
    private server_url: string = "not set";

    public constructor(url: string) {
        this.server_url = url;
    }

    public async getCollectionInfo(collectionMetadata: CollectionMetadata): Promise<CollectionInfo> {
        return fetchCollectionInfo(collectionMetadata);
    }

    public async getRatings(collectionId: string, collectionInfo: CollectionInfo, formats: Format[]): Promise<Ratings> {
        const response = await fetch(`${this.server_url}/ratings?collection_id=${collectionId}`);
        if (!response.ok) {
            return Promise.reject("getRatings response not ok");
        }
        const ratings = parseRatings(await response.json() as RatingsGetJson);

        updateFromCollectionInfo(ratings, collectionInfo, formats);
        updateRatingsFromLocalStorage(collectionId, ratings);
        return ratings;
    }

    public postRating({ collectionId, formatId, rating, cardCode, setCode }: RatingsPostRequest): void {
        setLocalStorageRating(collectionId, formatId, setCode, cardCode, rating);
        fetch(`${this.server_url}/ratings?collection_id=${collectionId}&rating=${rating}&card_code=${cardCode}&set_code=${setCode}&format_id=${formatId}`, {
            method: "POST",
        });
    }

    public async getCollectionMetadata(): Promise<Collections> {
        const collections = await (await fetch(`/collections.json`)).json() as Collections;

        for (const [k, v] of Object.entries(collections.entries)) {
            v.id = k; // note id is still undefined here as opposed to what the type states
        }

        for (const x of collections.formats) {
            const val = ProgramStore.getItem(makeFormatStorageKey(x.title));
            if (val !== null) {
                x.enabled = val === "true";
            }
        }

        return collections;
    }
}

