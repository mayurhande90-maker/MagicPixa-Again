
// This file is now a barrel file re-exporting icons from the modular structure.
export * from './icons/types';
export * from './icons/featureIcons';
export * from './icons/uiIcons';
export * from './icons/actionIcons';
export * from './icons/statusIcons';
export * from './icons/brandIcons';
export * from './icons/adMakerIcons';
export * from './icons/headshotIcons';

// Add specific exports if missing from sub-files or alias them here
import { CalendarIcon } from './icons/uiIcons';
export { CalendarIcon };
import { CampaignStudioIcon } from './icons/featureIcons';
export { CampaignStudioIcon };
