'use strict'

const Schema = use('Schema')

class RolesTableSchema extends Schema {
  up () {
    this.dropIfExists('roles')

    this.create('roles', table => {
      table.uuid('id')
      table.primary('id')

      table.string('slug').notNullable().unique()
      table.string('name').notNullable().unique()
      table.text('description').nullable()

      table.timestamps()
    })
  }

  down () {
    this.drop('roles')
  }
}

module.exports = RolesTableSchema
