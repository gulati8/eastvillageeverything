import { Router, Request, Response } from 'express';
import { PlaceModel, TagModel } from '../models/index.js';

const router = Router();

// Public home page - displays all places with tag filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const [places, tags] = await Promise.all([
      PlaceModel.findAll(),
      TagModel.findAll()
    ]);

    // Format places for display
    const formattedPlaces = places.map(place => ({
      ...place,
      displayPhone: place.phone
        ? `(${place.phone.substr(0,3)}) ${place.phone.substr(3,3)}-${place.phone.substr(6,4)}`
        : '',
      tagClasses: place.tags.join(' ')
    }));

    res.render('public/index', {
      places: formattedPlaces,
      tags
    });
  } catch (error) {
    console.error('Error loading public page:', error);
    res.status(500).send('Error loading page');
  }
});

export default router;
