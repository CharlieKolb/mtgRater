import React, { useEffect, useState } from 'react';
import SetData from './setData';

export type CardProps = {
    setCode: string; // e.g. "neo", "dmu", "bro", not "BRO"
    language: string; // e.g. "en", "jp"
}

function makeUrl({ setCode, language }: Readonly<CardProps>, cardNumber: number) {
    return `https://api.scryfall.com/cards/${setCode}/${cardNumber + 1}/${language}`;
}

export default function Card(props: CardProps) {
    const [cardNumber, setCardNumber] = useState(0);
    const [source, setSource] = useState("https://backs.scryfall.io/large/d/3/d3335a33-505d-422a-a03c-5dd9b1388046.jpg?1665006244")

    function handleNextCard() {
        setCardNumber((SetData[props.setCode].length + cardNumber + 1) % SetData[props.setCode].length);
    }

    function handlePreviousCard() {
        setCardNumber((SetData[props.setCode].length + cardNumber - 1) % SetData[props.setCode].length);
    }

    useEffect(() => {
        let ignore = false;

        async function resolveImage() {
            const url = makeUrl(props, cardNumber);
            console.log(`url is ${url}`);
            const response = await fetch(url);
            const responseJson = await response.json();
            if (!ignore) {
                setSource(responseJson['image_uris']['normal'])
            }
        }

        resolveImage();
        return () => {
            ignore = true;
        }
    }, [cardNumber])

    return (
        <div>
            <img className="card" src={source} />
            <div className="rows">
                <button onClick={handlePreviousCard}>Previous</button>
                <button onClick={handleNextCard}>Next</button>
            </div>
        </div>
    )
}
