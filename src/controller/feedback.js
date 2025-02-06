
const mongoose = require("mongoose");
const createError = require("http-errors");
const Feedback = require("../models/Feedback")
const logError = require("../services/logger");
const fastcsv = require('fast-csv')

const moment = require('moment')


var controllers = {
  post_save_feedback: async function (req, res) {
    let { id } = req.params
    console.log(req.body)
    let { rating, feedback } = req.body

    if (!rating && !feedback) {
      return res.status(422).json({
        status: false,
        message: 'Cannot process your request'
      })
    }

    try {
      let existingFeedback = await Feedback.findOne({
        userId: new mongoose.Types.ObjectId(id)
      }).lean().exec()

      console.log(existingFeedback)

      if (!existingFeedback) {
        let newFeedback = new Feedback({
          userId: new mongoose.Types.ObjectId(id),
          rating: rating,
          feedback: String(feedback)
        })

        await newFeedback.save()

        return res.status(201).json({ status: true, message: 'Feedback received' })
      }

      return res.status(403).json({
        status: false,
        message: 'You already have feedback for the system'
      })

    } catch (err) {
      await logError(err, "Survey.post_save_feedback", null, null, "POST")
      res.status(400).json({ success: false, msg: err });
      throw new createError.InternalServerError(err);
    }
  },
  get_feedbacks: async function (req, res) {
    let page = req.query.page || 1

    let limit = 20
    let skip = (page - 1) * limit

    try {
      let feedbacks = await Feedback.find({}).populate('userId').limit(limit).skip(skip).lean().exec()

      return res.status(200).json({
        status: true,
        message: 'Feedbacks fetched.',
        data: feedbacks
      })
    } catch (err) {
      console.log(err)
      return res.status(500).json({
        status: false,
        message: 'Error in getting feedbacks, please try again.',
      })
    }
  },
  get_feedbacks_by_ratings: async function (req, res) {
    let page = req.query.page || 1
    let star = req.params.star

    let limit = 20
    let skip = (page - 1) * limit

    try {
      let feedbacks = await Feedback.find({ rating: star }).populate('userId').sort({
        createdAt: 1
      }).limit(limit).skip(skip).lean().exec()

      return res.status(200).json({
        status: true,
        message: 'Feedbacks fetched.',
        data: feedbacks
      })
    } catch (err) {
      console.log(err)
      return res.status(500).json({
        status: false,
        message: 'Error in getting feedbacks, please try again.',
      })
    }
  },
  download_feedbacks: async function (req, res) {



    let filename = 'feedbacks.csv'
    try{
    let csvtransformer = (doc) => {
      console.log(doc)
      let obj = {}
      obj['name'] = doc.userId.displayName
      obj['rating'] = doc.rating
      obj['feedback'] = doc.feedback
      obj['date'] = moment(doc.createdAt).format('MMMM Do YYYY, h:mm:ss a')
      return obj
    }

    res.setHeader('Content-disposition', `attachment; filename=${filename}`);
    res.writeHead(200, { 'Content-Type': 'text/csv' });
    res.flushHeaders()

    let feedbacksStream = await Feedback.find({}).populate('userId').cursor({
      batchSize: 50
    })


    let csvstream = fastcsv.format({
      headers:true
    }).transform(csvtransformer)


    feedbacksStream.pipe(csvstream).pipe(res)
    }catch(err){
      return res.status(500).json({
        status: false,
        message: 'Something happened at downloading feedbacks'
      })
    }


  }
}

module.exports = controllers
