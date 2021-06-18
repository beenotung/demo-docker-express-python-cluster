import express from 'express'

export let router = express.Router()

router.get('/session', (req, res) => {
  res.json(req.session)
})
