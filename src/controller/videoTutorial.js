const createError = require("http-errors");
const mongoose = require('mongoose')
const Videos = require("../models/Video");
const logError = require("../services/logger");


const controllers ={
    addVideoTutorial: async function(req, res){
        try{
            const {uid, store, youtubeId, title, description} = req.body
            if(!uid || !store || !youtubeId || !title || !description){
                return res.status(400).json({
                    success: false,
                    message: 'One of the payload is undefined'
                })
            }

            const data ={
                uid,
                store,
                youtubeId,
                title,
                description
            }
            const newVideo = new Videos(data)
            const storeVideoResult = await newVideo.save()

            if(storeVideoResult){
                return res.status(200).json({
                    success: true,
                    message: "Successfully saved"
                })
            }
            return res.status(202).json({
                success: false,
                message:"Something went wrong"
            })

        }catch(error){
            console.log(error)
            return res.status(500).json({
                message:'Internal server error',
                body: error
            })
        }
    },

    editVedioTutorial: async function(req, res){
        try{
            const {...updateValues} = req.body
            const {_id} = req.params
            if(!_id){
                return res.status(400).json({
                    success: false,
                    message: '_id is undefined'
                })
            }

            const updateObject = {};

            for (const key in updateValues) {
                const value = updateValues[key];

                if (value !== undefined && value !== null && value !== '') {
                    updateObject[key] = value;
                }
            }

            const videoResult = await Videos.findOneAndUpdate({_id:_id}, 
                {$set:updateObject},
                {new: true}
            )

            if(videoResult){
                return res.status(200).json({
                    success: true,
                    message: 'Edited successfully'
                })
            }

            return res.status(404).json({
                success:false,
                message:'Video not found'
            })
        }catch(error){
            return res.status(500).json({
                message:'Internal server error',
                body: error
            })
        }
    },

    deleteVideoTutorial: async function(req, res){
        try{
            const {_id} = req.params
            if(!_id){
                return res.status(400).json({
                    success: false,
                    message: '_id is undefined'
                })
            }

            const deleteResult = await Videos.findOneAndDelete({_id:_id})
            if(deleteResult){
                return res.status(200).json({
                    success: true,
                    message:'Successfully deleted'
                })
            }
            return res.status(404).json({
                success:false,
                message:'No video Found'
            })
        }catch(error){
            console.log(error)
            return res.status(500).json({
                message:'Internal server error',
                body: error
            })
        }
    },

    getAllVideos: async function(req, res){
        try{
            const {company} = req.params
            console.log(company)
            if(!company){
                console.log("Sulod dinhe")
                return res.status(400).json({
                    success: false,
                    message: 'Store undefined'
                })   
            }
            const result = await Videos.find({store:company})
            if(result.length > 0){
                return res.status(200).json({
                    success: true,
                    message: 'Successfully fetched',
                    body: result
                })
            }

            return res.status(404).json({
                success: false,
                message: 'No videos yet'
            })
        }catch(error){
            return res.status(500).json({
                message: 'Internal server error',
                body: error
            })
        }
    }
}

module.exports = controllers;