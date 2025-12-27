
// ... line 120
    return (
        <>
            <FeatureLayout 
                title="Pixa Thumbnail Pro" description="Create viral, high-CTR thumbnails. Analyze trends and generate hyper-realistic results." icon={<ThumbnailIcon className="size-full"/>} rawIcon={true} creditCost={cost} isGenerating={loading} canGenerate={!!hasRequirements && !isLowCredits} onGenerate={handleGenerate} resultImage={result} creationId={lastCreationId}
// ... rest of file
