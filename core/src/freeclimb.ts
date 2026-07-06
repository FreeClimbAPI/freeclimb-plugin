import type { Method } from "axios"
import * as Errors from "./errors.js"
import { apiRequest, publicRequest } from "./http.js"

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

    constructor(endpoint: string, authenticate: boolean, errorHandler: Errorer) {
        this.endpoint = endpoint.length > 0 ? `/${endpoint}` : ""
        this.authenticate = authenticate
        this.errorHandler = errorHandler
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
        const params = (requestContent as Query) ? (requestContent as Query).params : undefined
        const data = (requestContent as Body) ? (requestContent as Body).data : undefined
        const requestMethod = method ?? "GET"

        try {
            const response = this.authenticate
                ? await apiRequest({ method: requestMethod, path: this.endpoint, params, data })
                : await publicRequest({
                      method: requestMethod,
                      path: this.endpoint,
                      params,
                      data,
                      auth: true,
                  })
            await onSuccess(response as FreeClimbResponse)
        } catch (error: any) {
            await onError(error)
        }
    }
}
