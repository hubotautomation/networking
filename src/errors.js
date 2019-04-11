class ConnectionFailure extends Error {
    constructor() {
        super('A conexão falhou')
        this.name = 'CONNECTION_FAILURE'
    }
}

class AuthenticationFailure extends Error {
    constructor() {
        super('Credenciais inválidas')
        this.name = 'AUTHENTICATION_FAILURE'
    }
}

class MaxRetriesFailure extends Error {
    constructor() {
        super('Número máximo de tentativas excedido')
        this.name = 'MAX_RETRIES_FAILURE'
    }
}

class NotAuthenticatedFailure extends Error {
    constructor() {
        super('Usuário não autenticado')
        this.name = 'NOT_AUTHENTICATED_FAILURE'
    }
}

class RequestTimeout extends Error {
    constructor() {
        super('Request timeout')
        this.name = 'REQUEST_TIMEOUT'
    }
}

class ForbiddenError extends Error {
    constructor() {
        super('Você não tem permissão para acessar essa central.')
        this.name = 'FORBIDDEN_ERROR'
    }
}

class CentralNotFoundFailure extends Error {
    constructor() {
        super('Central não encontrada ou não conectada no Hubot Cloud')
        this.name = 'CENTRAL_NOT_FOUND_FAILURE'
    }
}

const errorMap = {
    'CENTRAL_NOT_FOUND_FAILURE': CentralNotFoundFailure,
    'CONNECTION_FAILURE': ConnectionFailure,
    'NOT_AUTHENTICATED_FAILURE': NotAuthenticatedFailure,
    'MAX_RETRIES_FAILURE': MaxRetriesFailure,
    'AUTHENTICATION_FAILURE': AuthenticationFailure
}

export {
    ConnectionFailure,
    AuthenticationFailure,
    MaxRetriesFailure,
    NotAuthenticatedFailure,
    CentralNotFoundFailure,
    ForbiddenError,
    RequestTimeout,
    errorMap
}
