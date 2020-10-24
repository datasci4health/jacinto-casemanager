'use strict'

const Database = use('Database')
const uuidv4 = require('uuid/v4')

const Artifact = use('App/Models/v1/Artifact')
const Env = use('Env')
const Category = use('App/Models/v1/Category')
const Case = use('App/Models/v1/Case')


class CategoryController {
  async store ({ request, response }) {
    const trx = await Database.beginTransaction()
    try {

      const category = new Category()
      category.id = await uuidv4()

      const c = request.all()
      c.artifact_id = c.artifact_id ? c.artifact_id : 'default-quest-image'

      category.merge(c)

      await category.save(trx)

      trx.commit()

      return response.json(category)
    } catch (e) {
      trx.rollback()
      console.log(e)

      return response.status(e.status).json({ message: e.message })
    }
  }


  async update ({ params, request, response }) {
    try {
      const category = await Category.find(params.id)

      if (category != null) {
        category.title = request.input('title') || null

      if (request.input('artifactId')){
        category.artifact_id = request.input('artifactId')
      }

        await category.save()
        return response.json(category)
      } else return response.status(500).json('category not found')
    } catch (e) {
      console.log(e)
      return response.status(500).json({ message: e })
    }
  }


  async linkCase ({ request, response }) {
    try {
      const { categoryId, caseId } = request.post()

      const category = await Category.find(categoryId)
      const c = await Case.find(caseId)

      await category.cases().save(c)

      return response.json('category and case successfully linked')
    } catch (e) {
      console.log(e)
      return response.status(500).json(e)
    }
  }

  async listCases ({ request, response, auth }) {
    try {
      const user = await auth.user
      const clearance = parseInt(request.input('clearance'))
      const categoryId = request.input('categoryId')
      const category = await Category.find(categoryId)
      // console.log('-=============================================');
      // console.log(category);
      const test = await Database
        .select([ 'cases.id', 'cases.title','cases.description',  'cases.author_grade', 'users.username'])
        .distinct('cases.id')
        /*
          WHERE cases.user_id = user.id OR (permission.entity='university'
          AND persmission.subject=user.institution_id)
        */
        // .select('*')
        // .select('cases.id, cases.title, cases.description, cases.')
        .from('cases')
        .leftJoin('permissions', 'cases.id', 'permissions.case_id')
        .join('users', 'users.id', 'cases.user_id')
        .where('cases.category_id', category.id)
        .where(function(){
          this
            .where('cases.user_id', user.id)
            .orWhere(function () {
              this
                .where('permissions.entity', 'institution')
                .where('permissions.subject', user.institution_id)
                .where('permissions.clearance', '>=', clearance)
            })
        })


        // .join('cases', 'users_cases.case_id', 'cases.id')


      return response.json(test)
    } catch (e) {
      console.log(e)
    }
  }

  async listCategories ({ request, response, auth }) {
    try {
      const resultCategory = await Category.all()
      const baseUrl = Env.getOrFail('APP_URL')
      const category = []
      console.log(baseUrl)

      for (var i = 0; i < resultCategory.rows.length; i++) {
        const categoryJSON = {}
        categoryJSON.id = resultCategory.rows[i].id
        categoryJSON.title = resultCategory.rows[i].title
        categoryJSON.template = resultCategory.rows[i].template

        const artifact = await Artifact.find(resultCategory.rows[i].artifact_id)
        console.log(artifact)
        categoryJSON.url = baseUrl + artifact.relative_path

        category.push(categoryJSON)
      }
      return response.json(category)
    } catch (e) {
      console.log(e)
      return response.status(500).json({ message: e.message })
    }
  }
}
module.exports = CategoryController
