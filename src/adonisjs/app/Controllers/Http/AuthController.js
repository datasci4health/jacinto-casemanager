'use strict'

const Logger = use('Logger')

const User = use('App/Models/v1/User');

class AuthController {
    async login({ request, auth, response, session }) {
        console.log('v2/session')
        try {
            let { email, password } = request.all();
// console.log(request)
            if (await auth.remember(true).attempt(email, password)) {
                console.log('------------------------------- attempt')
                        // console.log(session.all())

                let user = await User.findBy('email', email)
                // let token = await auth.generate(user)
                
                // let authenticatedUser = new User()
                // authenticatedUser.id = user.id
                // authenticatedUser.email = user.email
                // authenticatedUser.username = user.username

                // Object.assign(authenticatedUser, token)
                // return response.json('Logged in successfully')

                let adonis_session = session.get('adonis-auth')
                console.log(adonis_session)
                console.log(auth)
                return response.json(adonis_session)

            }
        }
        catch (e) {
            console.log(e)
            return response.status(e.status).json({ message: e.message })
        }
    }

    async logout({ auth, response }) {
        try{

            await auth.logout()
            
            return response.json('Logged out successfuly')
        }catch(e){
            console.log(e)
            return response.status(500).json(e.message)
        }
        
    }
}

module.exports = AuthController




