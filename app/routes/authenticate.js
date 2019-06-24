const express = require('express');

const router = express.Router();

router.get('/logout', (request, response) => {
	request.logout();
	response.redirect('/');
});

module.exports = router;
