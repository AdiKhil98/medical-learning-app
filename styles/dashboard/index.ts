import { layoutStyles } from './layout';
import { headerStyles } from './header';
import { cardStyles } from './cards';
import { navigationStyles } from './navigation';
import { sectionStyles } from './sections';

export const dashboardStyles = {
  ...layoutStyles,
  ...headerStyles,
  ...cardStyles,
  ...navigationStyles,
  ...sectionStyles,
};

export { layoutStyles, headerStyles, cardStyles, navigationStyles, sectionStyles };
export { screenWidth, screenHeight } from './layout';