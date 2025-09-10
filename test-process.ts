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
		id = response.data.id
		await testStatus()
	} catch (err) {
		console.error('Error in testProcess:', err)
	}
}

// testUpload().catch((err) => console.error('Error in testProcess:', err))



// call status with the id from upload
async function testStatus() {
	console.log('Testing status with id:', id)
	if (!id || id === '') {
		console.error('No id to check status')
		return
	}
	const statusUrl = `http://localhost:8080/status/${id}`
	try {
		const response = (await axios.get(statusUrl)).data as InterRequestResponseBody
		console.log('Status Response:', JSON.stringify(response))

		// check if there is an output_url in the response and if so, call fetch
		if (response.infer_requests && response.infer_requests.length > 0) {
			const inferRequest = response.infer_requests[0]
			if ('output_url' in inferRequest && inferRequest.output_url) {
				console.log('Found output_url:', inferRequest.output_url)
				await testFetch(inferRequest.output_url.toString())
			} else {
				console.log('No output_url found yet.')
			}
		}
	} catch (err) {
		console.error('Error in testStatus:', err)
	}
}

// wait 10 seconds and then call status
// setTimeout(() => {
// 	testStatus().catch((err) => console.error('Error in testStatus:', err))
// }, 5000)


// call fetch get endpoint with the url from status
async function testFetch(fileUrl: string) {
	console.log('Testing fetch with url:', fileUrl)
	const fetchUrl = `http://localhost:8080/fetch/${encodeURIComponent(fileUrl)}`
	try {
		const response = await axios.get(fetchUrl, { responseType: 'stream' })
		const outputPath = path.join(__dirname, '/output.jpg')
		const writer = fs.createWriteStream(outputPath)
		response.data.pipe(writer)
		writer.on('finish', () => {
			console.log('File saved to', outputPath)
		})
		writer.on('error', (err) => {
			console.error('Error writing file:', err)
		})
	} catch (err) {
		console.error('Error in testFetch:', err)
	}
}

testFetch('srvc_e37azmytfn2bspxak9228q46r83/prj_qwavch29ftp965zfxi7vrzsfs2kq/infr_rqst_zgz37z6eew84a54r1c6chd_image_url.jpg').catch((err) => console.error('Error in testFetch:', err))