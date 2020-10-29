import * as express from 'express';
import {functions} from './firebase';
const campaign = require('./campaign');

const app: any = express();

app.post('/api/:campaignId/vote', campaign.vote)
app.post('/api/campaigns/create', campaign.create)
app.get('/api/campaigns', campaign.list)
app.get('/api/campaigns/:campaignId/votes', campaign.getCampaign)
app.get('/api/campaigns/ended/:campaignId/results', campaign.getEndedCampaign)

exports.app = functions.https.onRequest(app);
