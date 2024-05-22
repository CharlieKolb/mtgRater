import { ScryfallCard } from "@scryfall/api-types";
import { Card, CardRating, Ratings } from "../server/backend";


const DEFAULT_IMAGE = "https://cards.scryfall.io/normal/front/5/a/5aa90ab6-2686-4462-8725-5d4370c05437.jpg?1663738897"


export function resolveImageFromInfo(scryfallCard: ScryfallCard.Any): string[] {
    if ("image_uris" in scryfallCard) {
        return [scryfallCard.image_uris?.normal || DEFAULT_IMAGE];
    }

    if ('card_faces' in scryfallCard) {
        return (scryfallCard as ScryfallCard.AnyDoubleSidedSplit)['card_faces'].map(x => x.image_uris?.normal || DEFAULT_IMAGE);
    }
    console.error("Scryfall object had neither card_faces nor image_uris");
    return [""];
}

export function resolveImage(card: Card): string[] {
    return resolveImageFromInfo(card.scryfallCard);
}
