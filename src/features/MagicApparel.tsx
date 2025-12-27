
// ... line 76
    return (
        <>
            <FeatureLayout 
                title="Pixa TryOn" description="Virtual dressing room. Try clothes on any person instantly." icon={<PixaTryOnIcon className="size-full"/>} rawIcon={true} creditCost={cost} isGenerating={loading} canGenerate={canGenerate} onGenerate={handleGenerate} resultImage={resultImage} onResetResult={resultImage ? undefined : handleGenerate} onNewSession={resultImage ? undefined : handleNewSession}
// ... rest of file
