import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';

admin.initializeApp(functions.config().firebase);

const db: FirebaseFirestore.Firestore = admin.firestore();

const app: any = express();

app.post('/api/:campaignId/vote', async (req: express.Request, res: express.Response) => {
    try {
        const campaignId: String = req.params.campaignId;

        const vote = {
            "name": req.body.name,
            "hkId": req.body.hkId,
            "createdAt": Date.now()
        };

        const campaignRef = await db.collection(`campaign`).doc(`/${campaignId}`);
        const campaignSnapshot = await campaignRef.get();
        const campaign = await campaignSnapshot.data();

        // check whether the hkId has voted
        let hkIds = [];
        campaign.votes.forEach(vote => {hkIds.push(vote.hkId)});
        if (hkIds.includes(vote.hkId)) {
            return res.status(400).send("You have already voted!")
        }

        let checkOptions = [];
        campaign.options.forEach(option => {checkOptions.push(option.name)});
        if (checkOptions.includes(vote.name)) {
            const options = campaign.options.map(option => {
                if (option.name == vote.name) {
                    option.voteCount = option.voteCount + 1;
                    return option
                } else {
                    return option
                }
            })

            // add votes to the votes field
            campaignRef.update({votes: admin.firestore.FieldValue.arrayUnion(vote)});
            campaignRef.update({options: options});
        } else {
            return res.status(400).send(`Option ${vote.name} not included in this campaign!`)
        }

        return res.status(200).send("Voted!");
    } 
    catch (err) {
        return res.status(500).send(err);
    }
})

app.post('/api/campaigns/create', async (req: express.Request, res: express.Response) => {
    try {
        const campaign = {
            "name": req.body.name,
            "desc": req.body.desc,
            "startDate": req.body.startDate,
            "endDate": req.body.endDate,
            "createdAt": Date.now(),
            "options": [],
            "votes": []
        }

        req.body.options.map((option: any) => {
            const temp = {
                "name": option,
                "voteCount": 0
            }

            campaign.options.push(temp)
        });

        const campaignRef = await db.collection(`campaign`);
        const docRef = await campaignRef.add(campaign);

        return res.status(200).send(`Campaign ${docRef.id} Added!`);
    }
    catch(err) {
        return res.status(500).send(err);
    }
})

app.get('/api/campaigns', async (req: express.Request, res: express.Response) => {
    try {

        const campaignRef = await db.collection(`campaign`).orderBy('createdAt', 'desc').get();
        const campaigns = [];
        campaignRef.forEach((doc) => {
            campaigns.push(doc.data());
        });

        return res.status(200).send(campaigns);
    } 
    catch (err) {
        return res.status(500).send(err);
    }
})

app.get('/api/campaigns/:campaignId', async (req: express.Request, res: express.Response) => {
    try {
        const campaignId: String = req.params.campaignId;

        const campaignSnapshot = await db.collection(`campaign`).doc(`/${campaignId}`).get();
        
        const campaign = campaignSnapshot.data()

        return res.status(200).send(campaign);
    } 
    catch (err) {
        return res.status(500).send(err);
    }
})


exports.app = functions.https.onRequest(app);
