import * as ui from '@mui/material';
import * as icons from '@mui/icons-material';

import { CardRatingValue, Distribution, Rating } from "../server/backend";

export type RatingBarProps = {
    title: string;
    rating: Rating;
    reveal: boolean;
    onRatingChanged: (rating: CardRatingValue) => void;
    handleDelete: ((event: any) => void);
}

function toDistribution({ rated_1, rated_2, rated_3, rated_4, rated_5 }: Rating): Distribution {
    return [
        rated_1, rated_2, rated_3, rated_4, rated_5,
    ];
}

export default function RatingBar({ title, reveal, rating, onRatingChanged, handleDelete }: RatingBarProps) {
    const distribution = toDistribution(rating);

    function handleRatingChange(value: string | number) {
        let res: CardRatingValue = 1;
        switch (value) {
            case "1": case 1: res = 1; break;
            case "2": case 2: res = 2; break;
            case "3": case 3: res = 3; break;
            case "4": case 4: res = 4; break;
            case "5": case 5: res = 5; break;
            default: console.log(`Received unexpected rating ${value}`); return;
        }

        onRatingChanged(res);
    }

    const theme = ui.useTheme();
    const isDesktop = ui.useMediaQuery(theme.breakpoints.up('md'));

    const targetWidth = 370;
    const minHeight = isDesktop ? 70 : 50;
    const gridHeight = minHeight * 0.9;


    const makeDistributionBox = (index: number) => {
        const totalVotes = distribution.reduce((v, n) => v + n); // Start with 1 to avoid div by 0
        const boxValue = distribution[index] + ((rating.localRating === index + 1) ? 1 : 0);
        const diameter = Math.max(2.5, (boxValue / Math.max(1, totalVotes + (rating.localRating === null ? 0 : 1))) * gridHeight);
        const shapeStyles = { width: diameter, height: diameter };
        const shapeCircleStyles = { borderRadius: '50%' };

        return (<ui.Grid key={index} item gridRow="1">
            <ui.Tooltip title={boxValue}>
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

    const desktopRadioGroup = (<ui.FormControl>
        <ui.RadioGroup
            row
            name="row-radio-buttons-group"
            onChange={(e, v) => handleRatingChange(v)}
            style={{
                paddingBottom: "0",
                paddingTop: "0",
            }}
        >
            <ui.FormControlLabel key="1" value="1" control={<ui.Radio />} label="1" labelPlacement="bottom" />
            <ui.FormControlLabel key="2" value="2" control={<ui.Radio />} label="2" labelPlacement="bottom" />
            <ui.FormControlLabel key="3" value="3" control={<ui.Radio />} label="3" labelPlacement="bottom" />
            <ui.FormControlLabel key="4" value="4" control={<ui.Radio />} label="4" labelPlacement="bottom" />
            <ui.FormControlLabel key="5" value="5" control={<ui.Radio />} label="5" labelPlacement="bottom" />
        </ui.RadioGroup>
    </ui.FormControl>
    );

    const mobileSlider = (<ui.Slider
        defaultValue={1}
        shiftStep={1}
        step={1}
        marks
        min={1}
        max={5}
        valueLabelDisplay="on"
        onChangeCommitted={(e, v) => {
            handleRatingChange(v as number);
        }}
        sx={{
            display: "flex",
            flexShrink: "1",
            margin: "0.5px",
            maxWidth: "90%",
            justifySelf: "center",
        }}
    />)

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
            {
                reveal ?
                    <ui.Grid container
                        display="grid"
                        alignItems="center"
                        justifyItems="center"
                        gridAutoColumns="1fr"
                        minHeight={gridHeight}
                        maxHeight={gridHeight}
                        maxWidth={targetWidth}
                        spacing={0}>
                        {makeDistributionBox(0)}
                        {makeDistributionBox(1)}
                        {makeDistributionBox(2)}
                        {makeDistributionBox(3)}
                        {makeDistributionBox(4)}
                    </ui.Grid > :
                    (isDesktop ? desktopRadioGroup : mobileSlider)

                // </ui.Grid>
            }
            {/* Spacing to keep previous component centered */}
            <ui.Box minWidth="90px" sx={{ display: { xs: "none", md: "block" } }}>
                <ui.IconButton color="error" onClick={handleDelete}>
                    <icons.RemoveCircleOutline fontSize="small" />
                </ui.IconButton>
            </ui.Box>
        </ui.Stack >);
}