import mongodb, {InsertOneWriteOpResult, WithId} from 'mongodb'

type IDocument = {
  _id: mongodb.ObjectId,
  [key: string]: any
}

export default class Model {
  public id?: mongodb.ObjectId
  public data: IDocument = {} as IDocument

  static collectionName: string
  static db: mongodb.Db

  static setDB(db: mongodb.Db): void {
    this.db = db
  }

  static get collection() {
    return this.db.collection(this.collectionName)
  }

  static async findById(id: string): Promise<any> {
    return await this.findOneByParams({ _id: new mongodb.ObjectId(id) })
  }

  static findOneByParams(params: mongodb.FilterQuery<any>) : Promise<Model> {
    return this.collection.findOne(params)
      .then(doc => {
        if (doc) {
          let instance: Model = new this()
          instance.id = doc._id
          instance.data = doc
          return instance
        } else {
          throw false
        }
      })
      .catch(e => {
        return e
      })
  }

  static async findManyByParams(
    params: mongodb.FilterQuery<{[key: string]: any}>,
    limit?: number,
    sort?: { field: string, direction: -1 | 0 | 1 }
  ): Promise<Array<{[key: string]: any}>>
  {
    let docs = this.collection.find(params )

    if (sort)
      docs = docs.sort({ [sort.field]: sort.direction })

    if (limit)
      docs = docs.limit(limit)

    return docs.toArray()
  }

  // async remove(classObj: any): Promise<any> {
  //   return classObj.collection.remove({
  //     _id: new mongodb.ObjectId(this.id)
  //   })
  // }

  async update(data: {[key: string]: any}, classObj: any) {
    return classObj.collection.updateOne({ _id: new mongodb.ObjectId(this.id) }, { $set: data })
  }

  static async getAll() {
    return this.collection.find().toArray()
  }

  static async create(data: {[key: string]: boolean | number | string}): Promise<InsertOneWriteOpResult<WithId<{ [key: string]: any }>>> {
    return this.collection.insertOne(data)
  }
}