import * as ui from '@mui/material';
import * as icons from '@mui/icons-material';

import { CardRatingValue, Distribution, LocalRating, Rating } from "../server/backend";

export type RatingBarProps = {
    title: string;
    rating: Rating;
    reportRating: (localRating: LocalRating, formatId: string) => void;
    handleDelete: ((event: any) => void);
}

function toDistribution({ rated_1, rated_2, rated_3, rated_4, rated_5 }: Rating): Distribution {
    return [
        rated_1, rated_2, rated_3, rated_4, rated_5,
    ];
}



export default function RatingBar({ title, rating, reportRating, handleDelete }: RatingBarProps) {
    const distribution = toDistribution(rating);


    function handleRatingChange(value: string | number) {
        let res: CardRatingValue = 1;
        // We increment locally mostly to avoid showing no votes for the number the user chose just now
        switch (value) {
            case "1": case 1: res = 1; rating.rated_1 += 1; break;
            case "2": case 2: res = 2; rating.rated_2 += 1; break;
            case "3": case 3: res = 3; rating.rated_3 += 1; break;
            case "4": case 4: res = 4; rating.rated_4 += 1; break;
            case "5": case 5: res = 5; rating.rated_5 += 1; break;
            default: console.log(`Received unexpected rating ${value}`); return;
        }
        rating.localRating = res;
        // setLocalValue(res);
        reportRating(rating.localRating, title);
    }

    const theme = ui.useTheme();
    const isDesktop = ui.useMediaQuery(theme.breakpoints.up('md'));

    const targetWidth = isDesktop ? 450 : "100%";
    const minHeight = isDesktop ? 70 : 60;
    const gridHeight = minHeight;


    const makeDistributionBox = (index: number) => {
        const totalVotes = distribution.reduce((v, n) => v + n); // Start with 1 to avoid div by 0
        const boxValue = distribution[index] + ((rating.localRating === index + 1) ? 1 : 0);
        // cap % at 0.75 to avoid size issues with few votes
        const diameter = Math.max(2.5, (Math.min(0.75, boxValue / Math.max(1, totalVotes + (rating.localRating === null ? 0 : 1)))) * gridHeight);
        const shapeStyles = { width: diameter, height: diameter };
        const shapeCircleStyles = { borderRadius: '50%' };

        return (<ui.Grid key={index} item gridRow="1">
            <ui.Tooltip title={boxValue} placement="right">
                < ui.Box
                    key={index}
                    bgcolor={rating.localRating === index + 1 ? "secondary.main" : "primary.main"
                    }
                    sx={{ /*"fontSize": Math.min(diameter - 3, 25) + "px",*/
                        ...shapeStyles, ...shapeCircleStyles
                    }
                    } />
            </ui.Tooltip>
        </ui.Grid >);
    }

    const makeRatingBox = (index: number) => <ui.Grid key={`ratingBox_${index}`} item gridRow="1">
        <ui.Radio key={index} value={index} onChange={() => handleRatingChange(index + 1)} />
    </ui.Grid>;


    const makeElement = rating.localRating !== null ? makeDistributionBox : makeRatingBox;

    return (
        <ui.Stack direction={{ xs: "column", md: "row" }} display="flex" alignSelf="stretch" alignItems="center" justifyContent="center" minHeight={minHeight}>
            <ui.Stack direction="row">
                {!isDesktop && <ui.Box width="36px" />
                }
                <ui.Box alignContent="center" justifyContent="center" minWidth={{ xs: "0", md: "90px" }} sx={{ textTransform: 'capitalize' }}>
                    <ui.Typography sx={{ margin: 0, textTransform: 'capitalize' }}>{title}</ui.Typography>
                </ui.Box>
                {!isDesktop && <ui.IconButton color="error" onClick={handleDelete}>
                    <icons.RemoveCircleOutline fontSize="small" />
                </ui.IconButton>
                }

            </ui.Stack>
            <ui.Grid container
                display="grid"
                margin="0px 5% 0px 5%"
                alignItems="center"
                alignContent="center"
                justifyContent="center"
                justifyItems="center"
                minHeight={minHeight}
                gridAutoColumns="1fr"
                maxWidth={targetWidth}>
                <ui.Grid item display="flex" gridRow="1"><icons.LooksOne color="primary" /></ui.Grid>
                {makeElement(0)}
                {makeElement(1)}
                {makeElement(2)}
                {makeElement(3)}
                {makeElement(4)}
                <ui.Grid item display="flex" gridRow="1"><icons.Looks5 color="primary" /></ui.Grid>

            </ui.Grid >
            {/* Spacing to keep previous component centered */}
            <ui.Box minWidth="90px" sx={{ display: { xs: "none", md: "block" } }}>
                <ui.IconButton color="error" onClick={handleDelete}>
                    <icons.RemoveCircleOutline fontSize="small" />
                </ui.IconButton>
            </ui.Box>
        </ui.Stack >);
}