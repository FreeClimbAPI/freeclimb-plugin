import axios from "axios"
import type { Method } from "axios"
import { cred } from "./credentials.js"
import { Environment } from "./environment.js"
import * as Errors from "./errors.js"
import { createApiAxios } from "./http.js"

type Errorer = { error(message: string, exitCode: { exit: number }): any }

type Body = { data: Record<string, any> }
type Query = { params: Record<string, any> }

type AxiosMethodType = Method | undefined

export type FreeClimbErrorResponse = { response: Body }

export type FreeClimbResponse = Body & { config?: any; status: number }

export class FreeClimbApi {
    private endpoint: string

    private errorHandler: Errorer

    private authenticate: boolean

    private baseUrl: string

    constructor(endpoint: string, authenticate: boolean, errorHandler: Errorer) {
        this.endpoint = endpoint.length > 0 ? `/${endpoint}` : ""
        this.authenticate = authenticate
        this.errorHandler = errorHandler
        this.baseUrl =
            Environment.getString("FREECLIMB_CLI_BASE_URL") || "https://www.freeclimb.com/apiserver"
    }

    async apiCall(
        method: AxiosMethodType,
        requestContent: any,
        onSuccess: (response: FreeClimbResponse) => any,
        onError = (error: any) => {
            let err: Errors.FreeClimbError
            if (error.response) {
                err = new Errors.FreeClimbAPIError(error.response.data)
            } else if (error instanceof Errors.FreeClimbError) {
                err = error
            } else {
                err = new Errors.DefaultFatalError(error)
            }
            this.errorHandler.error(err.message, { exit: err.code })
        },
    ) {
        if (this.authenticate) {
            // Use the resilient shared HTTP client for authenticated calls
            try {
                const client = await createApiAxios()
                const response = await client.request({
                    url: this.endpoint,
                    method: method,
                    params: (requestContent as Query)
                        ? (requestContent as Query).params
                        : undefined,
                    data: (requestContent as Body) ? (requestContent as Body).data : undefined,
                })
                await onSuccess(response as FreeClimbResponse)
            } catch (error: any) {
                await onError(error)
            }
            return
        }

        // Unauthenticated calls use axios directly
        const accountId = (await cred.accountId) || ""
        const apiKey = (await cred.apiKey) || ""
        await axios(`${this.baseUrl}${this.endpoint}`, {
            method: method,
            auth: { username: accountId, password: apiKey },
            params: (requestContent as Query) ? (requestContent as Query).params : undefined,
            data: (requestContent as Body) ? (requestContent as Body).data : undefined,
        })
            .then(onSuccess)
            .catch(onError)
    }
}
