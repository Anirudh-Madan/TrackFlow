const express = require('express');
const router  = express.Router();
const c = require('./settings.controller');
const authenticate = require('../../middleware/authenticate');

router.use(authenticate);

router.get('/',            c.getSettings);
router.post('/set-pin',    c.setPin);
router.post('/verify-pin', c.verifyPin);

module.exports = router;
