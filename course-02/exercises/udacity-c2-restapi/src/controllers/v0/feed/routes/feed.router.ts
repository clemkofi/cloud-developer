import { Router, Request, Response } from "express";
import { FeedItem } from "../models/FeedItem";
import { requireAuth } from "../../users/routes/auth.router";
import * as AWS from "../../../../aws";

const router: Router = Router();

// Get all feed items
router.get("/", async (req: Request, res: Response) => {
  const items = await FeedItem.findAndCountAll({ order: [["id", "DESC"]] });
  items.rows.map((item) => {
    if (item.url) {
      item.url = AWS.getGetSignedUrl(item.url);
    }
  });
  res.send(items);
});

//@TODO
//Add an endpoint to GET a specific resource by Primary Key
router.get("/:id", async (req: Request, res: Response) => {
  let { id } = req.params;

  // find the feed item using the id provided
  const oneItem = await FeedItem.findByPk(id);

  oneItem.url = AWS.getGetSignedUrl(oneItem.url);
  res.send(oneItem);
});

// update a specific resource
router.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  let { id } = req.params;

  // get the contents of the update and check it
  let caption = req.body.caption;
  let fileName = req.body.url;

  // check Filename is valid
  if (!fileName) {
    return res.status(400).send({ message: "File url is required" });
  }

  // Method one for update
  // find the feed item using the id provided and update it
  //   const oneItem = await FeedItem.findByPk(id)
  //     .then((record) => {
  //       if (!record) {
  //         throw new Error("No record found");
  //       }

  //       console.log(`retrieved record ${JSON.stringify(record, null, 2)}`);

  //       // get the values to update the fields
  //       let values = {
  //         caption: !caption ? record.caption : caption,
  //         fileName: fileName,
  //       };

  //       // update the specified record / row
  //       record.update(values).then((updatedRecord) => {
  //         updatedRecord.url = AWS.getGetSignedUrl(updatedRecord.url);
  //         console.log(`updated record ${JSON.stringify(updatedRecord, null, 2)}`);
  //         res.status(201).send(updatedRecord);
  //       });
  //     })
  //     .catch((error) => {
  //       // do seomthing with the error
  //       throw new Error(error);
  //       //@TODO try it yourself
  //       res.status(400).send("Feed not updated");
  //     });

  // Method two for update
  const oneItem = await FeedItem.findByPk(id);

  // get the values to update the fields
  let updateValues = {
    caption: !caption ? oneItem.caption : caption,
    fileName: fileName,
  };

  // update the fields with new values
  const updatedItem = await oneItem.update(updateValues);

  updatedItem.url = AWS.getGetSignedUrl(updatedItem.url);

  res.status(201).send(updatedItem);
});

// Get a signed url to put a new item in the bucket
router.get(
  "/signed-url/:fileName",
  requireAuth,
  async (req: Request, res: Response) => {
    let { fileName } = req.params;
    const url = AWS.getPutSignedUrl(fileName);
    res.status(201).send({ url: url });
  }
);

// Post meta data and the filename after a file is uploaded
// NOTE the file name is they key name in the s3 bucket.
// body : {caption: string, fileName: string};
router.post("/", requireAuth, async (req: Request, res: Response) => {
  const caption = req.body.caption;
  const fileName = req.body.url;

  // check Caption is valid
  if (!caption) {
    return res
      .status(400)
      .send({ message: "Caption is required or malformed" });
  }

  // check Filename is valid
  if (!fileName) {
    return res.status(400).send({ message: "File url is required" });
  }

  const item = await new FeedItem({
    caption: caption,
    url: fileName,
  });

  const saved_item = await item.save();

  saved_item.url = AWS.getGetSignedUrl(saved_item.url);
  res.status(201).send(saved_item);
});

export const FeedRouter: Router = router;
