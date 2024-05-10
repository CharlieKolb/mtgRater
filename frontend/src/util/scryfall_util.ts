import { ScryfallCard } from "@scryfall/api-types";
import { Card, Collection } from "../server/backend";


const DEFAULT_IMAGE = "https://cards.scryfall.io/normal/front/5/a/5aa90ab6-2686-4462-8725-5d4370c05437.jpg?1663738897"


export async function resolveImageFromInfo(cardInfo: ScryfallCard.Any): Promise<string[]> {
    if ("image_uris" in cardInfo) {
        return [cardInfo.image_uris?.normal || DEFAULT_IMAGE];
    }

    if ('card_faces' in cardInfo) {
        return (cardInfo as ScryfallCard.AnyDoubleSidedSplit)['card_faces'].map(x => x.image_uris?.normal || DEFAULT_IMAGE);
    }
    console.error("Scryfall object had neither card_faces nor image_uris");
    return [""];
}

export async function resolveImage(collection: Collection, card: Card): Promise<string[]> {
    const cardDetail = (await collection.cardDetails).get(card.set_code + card.card_code);
    if (cardDetail) {
        return await resolveImageFromInfo(cardDetail);
    }
    return Promise.reject("Outdated");
}
