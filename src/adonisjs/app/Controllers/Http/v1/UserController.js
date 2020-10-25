'use strict'

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

const Database = use('Database')
const Helpers = use('Helpers')

const Case = use('App/Models/v1/Case')
const User = use('App/Models/v1/User')
const Institution = use('App/Models/v1/Institution')
const Artifact = use('App/Models/v1/Artifact')
const Quest = use('App/Models/v1/Quest')
const Property = use('App/Models/Property')

const uuidv4 = require('uuid/v4')
const Env = use('Env')

class UserController {
  /**
   * Show a list of all users.
   * GET users
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async index ({ request, response, view, auth }) {
    try {
      const users = await User.all()
      return response.json(users)
    } catch (e) {
      return response.status(e.status).json({ message: e.message })
    }
  }

  /**
   * Display a single user.
   * GET users/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async show ({ params, request, response, view }) {
    try {
      const user = await User.find(params.id)

      if (user != null) { return response.json(user) } else return response.status(500).json('user not found')
    } catch (e) {
      console.log(e)
      return response.status(e.status).json({ message: e.message })
    }
  }

  /**
   * Create/save a new user.
   * POST users
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async store ({ request, auth, response }) {
    try {
      const user = new User()

      user.id = await uuidv4()
      user.username = request.input('username')
      user.email = request.input('email')
      user.password = request.input('password')
      user.login = request.input('login')
      user.grade = request.input('grade')

      const request_institution = request.input('institution')

      if (request_institution != null) {
        const institution = await Institution.findBy('acronym', request.input('institution'))
        await user.institution().associate(institution)
      } else {
        await user.save()
      }

      return response.json(user)
    } catch (e) {
      console.log(e)
      if (e.code === 'ER_DUP_ENTRY') {
        return response.status(409).json(e.sqlMessage)
      }

      return response.status(e.status).json({ message: e.message })
    }
  }

  /**
   * Update user details.
   * PUT or PATCH users/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response

   */
  async update ({ params, request, response, auth }) {
    try {
      const newUser = request.all()

      const storeduser = await User.find(params.id)

      if (storeduser != null) {
        await storeduser.merge(newUser)
        await storeduser.save()
        return response.json(storeduser)
      } else return response.status(500).json('user not found')
    } catch (e) {
      return response.status(e.status).json({ message: e.message })
    }
  }

  /** Delete a user with id.
   * DELETE user/:id */
  async destroy ({ params, response, auth }) {
    try {
      const user = await User.find(params.id)

      if (user != null) {
        await user.delete()
      } else return response.json('user not found')

      return response.json(user)
    } catch (e) {
      return response.status(e.status).json({ message: e.message })
    }
  }

  async list_quests ({ request, response, auth }) {
    try {
      const user = await auth.user

      return response.json(await user.quests().fetch())
    } catch (e) {
      console.log(e)
      return response.status(500).json({ message: e.message })
    }
  }

  async listCases ({ request, response, auth }) {
    try {
      const user = await auth.user

      const clearance = parseInt(request.input('clearance'))
    //  Atualmente retorn somente a permissões via institution, é preciso aumentar a sql pra comportar outros escopos: grupos, only me, system, etc...
    //  Return cases which the user is author AND cases which she have access permission

      const result = await Database
        .select([ 'cases.id', 'cases.title','cases.description', 'cases.language', 'cases.domain',
          'cases.specialty', 'cases.keywords', 'cases.complexity', 'cases.original_date',
          'cases.author_grade', 'users.username'])
        .distinct('cases.id')
        .from('cases')
        .leftJoin('permissions', 'cases.id', 'permissions.table_id')
        .join('users', 'users.id', 'cases.author_id')
        .where('cases.author_id', user.id)
        .orWhere(function () {
          this
            .where('permissions.entity', 'institution')
            .where('permissions.subject', user.institution_id)
            .where('permissions.clearance', '>=', clearance)
        })

      console.log(result)
      return response.json(result)
    } catch (e) {
      console.log(e)
      return response.status(500).json({ message: e.message })
    }
  }

  async casesByInstitution ({ params, response, auth }) {
    try {
      const user = await auth.user

      let casesByInstitution = await Case.findBy('institution_id', user.institution_id)

      return response.json(casesByInstitution)
    } catch (e) {
      console.log(e)
      return response.status(500).json({ message: e.message })
    }
  }

  async list_cases_by_quests ({ params, response, auth }) {
    try {
      const user = await auth.user

      Database
        .select('*')
        .from('quests_users')
        .where('user_id', user.id)
        .leftJoin('cases', 'quests.case_id', 'cases.id')

      const quests = await user.quests().fetch()

      const cases = await user.cases().fetch()
    } catch (e) {
      console.log(e)
      return response.status(500).json({ message: e.message })
    }
  }

  async listContributingQuests ({ response, auth }) {
    try {
      const user = await auth.user

      const resultQuest = await Database
        .select('*')
        .from('quests_users')
        .where('user_id', user.id)
        .whereIn('permission', ['write', 'share', 'delete'])
        .leftJoin('quests', 'quests_users.quest_id', 'quests.id')

      const base_url = Env.getOrFail('APP_URL')
      const quests = []

      for (var i = 0; i < resultQuest.length; i++) {
        const questJSON = {}

        questJSON.id = resultQuest[i].quest_id
        questJSON.title = resultQuest[i].title
        questJSON.color = resultQuest[i].color

        const artifact = await Artifact.find(resultQuest[i].artifact_id)
        questJSON.url = base_url + artifact.relative_path

        quests.push(questJSON)
      }

      return response.json(quests)
    } catch (e) {
      console.log(e)
      return response.status(500).json({ message: e.message })
    }
  }

  async listPlayingQuests ({ response, auth }) {
    try {
      const user = await auth.user

      const resultQuest = await Database
        .select('*')
        .from('quests_users')
        .where('user_id', user.id)
        .where('permission', 'read')
        .leftJoin('quests', 'quests_users.quest_id', 'quests.id')

      const base_url = Env.getOrFail('APP_URL')
      const quests = []

      for (var i = 0; i < resultQuest.length; i++) {
        const questJSON = {}

        questJSON.id = resultQuest[i].quest_id
        questJSON.title = resultQuest[i].title
        questJSON.color = resultQuest[i].color

        const artifact = await Artifact.find(resultQuest[i].artifact_id)
        questJSON.url = base_url + artifact.relative_path

        // let properties = await artifact.properties().fetch()

        // let resultProperties = await Database
        //   .select('*')
        //   .from('artifacts_properties')
        //   .where('artifact_id', artifact.id)
        //   .leftJoin('properties', 'artifacts_properties.property_id', 'properties.id')

        // let propertiesJSON = []
        // console.log(artifact.id)
        // console.log(resultProperties)
        // for (var i = 0; i < resultProperties.length; i++) {
        //   console.log('aqui')
        //   let propertyJSON = {}
        //   propertyJSON.title = resultProperties[i].title
        //   propertyJSON.value = resultProperties[i].value
        //   propertiesJSON.push(propertyJSON)
        // }

        // questJSON.properties = propertiesJSON

        quests.push(questJSON)
      }

      return response.json(quests)
    } catch (e) {
      console.log(e)
      return response.status(500).json({ message: e.message })
    }
  }
}

module.exports = UserController
