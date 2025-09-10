import multer, { Multer } from 'multer'
import { Request, Response } from 'express'

// Extend Express Request type to include Multer's file property
declare global {
	namespace Express {
		interface Request {
			file?: multer.File
		}
	}
}
import { EdgeCloudClient } from './services/EdgeCloud'
import 'dotenv/config' // Load environment variables from .env file
import { CloudRunBase } from '@scaine-io/shared'

const THETA_EDGECLOUD_TOKEN = process.env.THETA_EDGECLOUD_TOKEN

export class Server extends CloudRunBase {
	constructor() {
		super()

		// Multer setup for file uploads (memory storage)
		const upload: Multer = multer({ storage: multer.memoryStorage() })

		// Image upload endpoint (save to local uploads/ directory)
		this.app.post('/upload', upload.single('image'), async (req: Request, res: Response) => {
			if (!req.file) return res.status(400).send('No file uploaded.')
			try {
				// theta edge cloud
				console.log('[01] Uploading image to Theta Edge Cloud')
				if (!THETA_EDGECLOUD_TOKEN || THETA_EDGECLOUD_TOKEN === '') throw new Error('THETA_EDGECLOUD_TOKEN is not set in environment variables')

				const edgeCloud = new EdgeCloudClient(THETA_EDGECLOUD_TOKEN)
				const presignedResponseBody = await edgeCloud.createInputPresignedUrls()
				await edgeCloud.uploadFileToThetaEdgeCloud(presignedResponseBody.image_filename.presigned_url, req.file.buffer)

				// hook is this function with route /hook
				const request = await edgeCloud.createInferRequest(presignedResponseBody.image_filename.filename)
				const inferRequestId = request.infer_requests[0].id

				console.log(`[02] requestId: ${inferRequestId}`)

				// Cloud Tasks expects a 2xx response for successful task completion.
				return res.status(200).json({ id: inferRequestId })
			} catch (error) {
				console.error(`Error uploading image:`, error)
				// Return a 5xx status code to signal Cloud Tasks to retry the task
				return res.status(500).send(`Internal Server Error: Failed to upload image.`)
			}
		})

		// status endpoint with id
		this.app.get('/status/:id', async (req: Request, res: Response) => {
			console.log(`Received status request`)
			const { id } = req.params
			try {
				const edgeCloud = new EdgeCloudClient(THETA_EDGECLOUD_TOKEN)
				const status = await edgeCloud.getInferRequest(id)
				// Cloud Tasks expects a 2xx response for successful task completion.
				return res.status(200).json(status)
			} catch (err: any) {
				console.error(`Error fetching status for id ${id}:`, err)
				return res.status(500).send(`Internal Server Error: Failed to fetch status for id ${id}.`)
			}
		})
	}
}

new Server()
