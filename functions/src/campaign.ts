import {db, admin} from './firebase';
import * as express from 'express';
import * as dayjs from 'dayjs';
import * as isBetween from 'dayjs/plugin/isBetween';
dayjs.extend(isBetween);

const campaignRes = (campaign) => {
    const payload = {
        "options": campaign.options,
        "campaignId": campaign.id,
        "startDate": `${dayjs(campaign.startDate)}`,
        "endDate": `${dayjs(campaign.endDate)}`,
        "name": campaign.name,
        "desc": campaign.desc
    };

    return payload
}

const checkCampaignOptions = (options) => {
    return new Promise((resolve, reject) => {
        // check options not Empty
        if(options.length < 2){
            reject('One or more options is required!')
        };

        // check options are different
        if(new Set(options).size !== options.length) {
            reject('No duplicate options allowed!')
        }

        options = options.map((option: any) => 
            option = {
                "name": option,
                "voteCount": 0
            })
        resolve(options);
    })
}

exports.create = async(req: express.Request, res: express.Response) => {
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

        let options = req.body.options
        options = await checkCampaignOptions(options)
        campaign.options = options;

        // campaign start date cannot be greater than end date
        if(dayjs(campaign.endDate).isBefore(dayjs(campaign.startDate))) {
            return res.status(400).send('Start date cannot be later than end date!')
        };

        const campaignRef = await db.collection(`campaign`);
        const docRef = await campaignRef.add(campaign);

        return res.status(200).send(`Campaign ${docRef.id} Added!`);
    }
    catch(err) {
        return res.status(500).send(err);
    }
}

exports.vote = async (req: express.Request, res: express.Response) => {
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

        // check whether campaign is active
        if(!dayjs(vote.createdAt).isBetween(dayjs(campaign.startDate), dayjs(campaign.endDate), null, '[]')) {
            return res.status(400).send("Campaign is not active!")
        }

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
};

exports.list = async (req: express.Request, res: express.Response) => {
    try {
        const campaignRef = await db.collection(`campaign`).orderBy('createdAt', 'desc').get();
        const campaigns = [];
        campaignRef.forEach((doc) => {
            let campaign = doc.data();
            campaign = campaignRes(campaign);
            campaign.id = doc.id;
            campaigns.push(campaign);
        });

        return res.status(200).send(campaigns);
    } 
    catch (err) {
        return res.status(500).send(err);
    }
};

exports.getCampaign =  async (req: express.Request, res: express.Response) => {
    try {
        const campaignId: String = req.params.campaignId;

        const campaignSnapshot = await db.collection(`campaign`).doc(`/${campaignId}`).get();
        
        let campaign = campaignSnapshot.data()
        campaign = campaignRes(campaign);
        campaign.id = campaignId;
 
        return res.status(200).send(campaign);
    } 
    catch (err) {
        return res.status(500).send(err);
    }
}

exports.getEndedCampaign = async (req: express.Request, res: express.Response) => {
    try {
        const campaignId: String = req.params.campaignId;

        const campaignSnapshot = await db.collection(`campaign`).doc(`/${campaignId}`).get();
        
        let campaign = campaignSnapshot.data()
        
        if(dayjs().isBefore(dayjs(campaign.endDate))) {
            return res.status(400).send('Campaign has not yet ended!')
        }

       campaign = campaignRes(campaign);
       campaign.id = campaignId;

        return res.status(200).send(campaign);
    } 
    catch (err) {
        return res.status(500).send(err);
    }
}