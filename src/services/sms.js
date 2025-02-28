const axios = require('axios')
//send sms code here



module.exports = {
	send_sms: async function (recipients, message) {
	    console.log('🚀 ~ message:', message)
	    console.log('🚀 ~ recipients:', recipients)

		if(recipients.length === 0) return
		
	    let token
	    try {
	      // Generate a new token
	      const response = await axios.post(
	        'https://svc.app.cast.ph/api/auth/signin',
	        {
	          username: process.env.CAST_USERNAME,
	          password: process.env.CAST_PASSWORD
	        },
	        {
	          headers: {
	            'Content-Type': 'application/json'
	          }
	        }
	      )

	      token = response.data.Token

	      console.log('New token:', token)
	    } catch (error) {
	      console.error('Error generating token:', error)
	    }


	   
	    // Send OTP
	    const url = 'https://svc.app.cast.ph/api/announcement/send'

	    const data = {
	      MessageFrom: "Sparkle",
	      Message: message,
	      Recipients: recipients
	    }
	    
	    console.log('🚀 ~ data:', data)

	    const headers = {
	      'Content-Type': 'application/json',
	      Authorization: 'Bearer ' + token
	    }

	    try {
	      const response = await axios.post(url, data, {headers})
		  console.log('🚀 ~ complete response:', response)
	      console.log('🚀 ~ response:', response.data)
	      return {success: true, data: response.data} // Return the response
	    } catch (error) {
	      console.error(error.response?.data || error.message) // Log more detailed error
	      return {success: false, error: error.response?.data || 'Failed to send OTP'} // Return error details
	    }
	   
	  }
}