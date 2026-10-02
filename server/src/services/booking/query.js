import { ambulanceOfferRepo } from '../../repositories/ambulanceOfferRepo.js';
import { offerView } from './views.js';

/** The offers sent to this ambulance (its page loads PENDING ones), with the serverNow clock. */
export async function listAmbulanceOffers(user, { statuses } = {}) {
  const offers = await ambulanceOfferRepo.listForAmbulance(user.id, statuses);
  return { offers: offers.map(offerView), serverNow: new Date() };
}
