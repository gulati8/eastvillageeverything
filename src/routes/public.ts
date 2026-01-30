import { Router, Request, Response } from 'express';
import { PlaceModel, TagModel } from '../models/index.js';

const router = Router();

// Public home page - displays all places with tag filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const [places, structuredTags] = await Promise.all([
      PlaceModel.findAll(),
      TagModel.findAllStructured()
    ]);

    // Build a map of tag value -> parent tag value for CSS class inheritance
    const tagToParentValue = new Map<string, string>();
    for (const parent of structuredTags.parents) {
      for (const child of parent.children) {
        tagToParentValue.set(child.value, parent.value);
      }
    }

    // Format places for display
    const formattedPlaces = places.map(place => {
      // Build tag classes including parent tag values for filtering
      const tagClasses: string[] = [];
      for (const tagValue of place.tags) {
        tagClasses.push(tagValue);
        // If this tag has a parent, also add the parent's value
        const parentValue = tagToParentValue.get(tagValue);
        if (parentValue && !tagClasses.includes(parentValue)) {
          tagClasses.push(parentValue);
        }
      }

      return {
        ...place,
        displayPhone: place.phone
          ? `(${place.phone.substr(0,3)}) ${place.phone.substr(3,3)}-${place.phone.substr(6,4)}`
          : '',
        tagClasses: tagClasses.join(' ')
      };
    });

    res.render('public/index', {
      places: formattedPlaces,
      structuredTags
    });
  } catch (error) {
    console.error('Error loading public page:', error);
    res.status(500).send('Error loading page');
  }
});

export default router;
