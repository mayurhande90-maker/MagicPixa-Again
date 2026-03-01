/**
 * Branding configuration for MagicPixa.
 * Centralized location for brand-specific constants like watermark settings.
 */
export const BRANDING = {
    name: "MagicPixa",
    watermark: {
        text: "MagicPixa",
        fontSizeRatio: 0.04, // 4% of image width
        minFontSize: 20,
        opacity: 0.5,
        color: "rgba(255, 255, 255, 0.5)",
        shadow: {
            color: "rgba(0, 0, 0, 0.3)",
            blur: 4,
            offsetX: 2,
            offsetY: 2
        },
        paddingRatio: 0.5, // 50% of font size
        position: "bottom-right" as "bottom-right" | "bottom-left" | "top-right" | "top-left" | "center"
    }
};
