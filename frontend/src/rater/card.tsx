import React from 'react';

export type CardProps = {
    setCode: string; // e.g. "neo", "dmu", "bro", not "BRO"
    setNumber: string; // e.g. "1", "100", not "01"
    language: string; // e.g. "en", "jp"
}

function makeUrl({ setCode, setNumber, language }: Readonly<CardProps>) {
    return `https://api.scryfall.com/cards/${setCode}/${setNumber}/${language}`;
}

export class Card extends React.Component<CardProps, { source: string }> {
    constructor(props: CardProps) {
        super(props);
        this.state = {
            source: "https://cards.scryfall.io/large/front/5/a/5a5841fa-4f30-495a-b840-3ef5a2af8fad.jpg", // todo: replace with cardback
        };

    }
    async componentDidMount() {
        const response = await fetch(makeUrl(this.props));
        const card_json = await response.json();
        this.setState({
            source: card_json['image_uris']['normal'],
        });
    }

    render() {
        return (
            <img className="card" src={this.state.source} alt="Card Not Found" />
        )
    }
}