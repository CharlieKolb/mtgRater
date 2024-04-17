type SetData = {
    length: number,
    code: string,
}

// @TODO(ckolb) This should arguably match up with draft environment and combine things like bonus sheets and the list to the appropriate code
// These are usually easiest to derive via a scryfall query like "set:otj or set:otp or set:big or (e:spg cn≥29 cn≤38)"
// So we should likely use an API request in our toolchain to derive this info and store it in a json we use to parse appropriate order of cards, which we then pass as a list rather than sticking to hardcoded cardNumbers and setCodes

const data: Record<string, SetData> = {
    dmu: {
        length: 281,
        code: "dmu",
    },
    otj: {
        length: 286,
        code: "otj",
    },
};

export default data;