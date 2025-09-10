import * as path from 'path'
import * as fs from 'fs'
import axios from 'axios'
import FormData from 'form-data'
import { InterRequestResponseBody } from '@scaine-io/types'

const url = 'http://localhost:8080/upload'
let id = ''
// call upload with the image hamburger.jpg
async function testUpload() {
	const formData = new FormData()
	const filePath = path.join(__dirname, '/hamburger.jpg')
	const fileStream = fs.createReadStream(filePath)
	formData.append('image', fileStream, 'hamburger.jpg')

	try {
		const response = await axios.post(url, formData, {
			headers: formData.getHeaders(),
		})
		console.log('Response:', response.data)
		id = response.data.inferRequestId
		await testStatus()
	} catch (err) {
		console.error('Error in testProcess:', err)
	}
}

testUpload().catch((err) => console.error('Error in testProcess:', err))



// call status with the id from upload
async function testStatus() {
	if (id === '') {
		console.error('No id to check status')
		return
	}
	const statusUrl = `http://localhost:8080/status/${id}`
	try {
		const response = (await axios.get(statusUrl)).data as InterRequestResponseBody
		console.log('Status Response:', JSON.stringify(response))
	} catch (err) {
		console.error('Error in testStatus:', err)
	}
}

// wait 10 seconds and then call status
setTimeout(() => {
	testStatus().catch((err) => console.error('Error in testStatus:', err))
}, 5000)
