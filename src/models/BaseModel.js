// // @flow
// import Joi from 'joi';
// import uuid from 'uuid';

// export default class BaseModel<Attributes> {
//   attrs: Attributes & { id: string };
//   static schema: Object;

//   constructor(attrs: Attributes & { id: string }) {
//     this.constructor.validate(attrs);
//     this.attrs = attrs;
//   }

//   static create(attrs: Attributes) {
//     return new this.constructor({ ...attrs, id: uuid() });
//   }

//   toJSON() {
//     return this.attrs;
//   }

//   static validate(attrs: mixed) {
//     let result = Joi.validate(this.schema, attrs);
//     if (result.error) throw result.error;
//   }
// }
