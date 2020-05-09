import {
	FindManyOptions,
	DeepPartial,
	ObjectID,
	FindConditions,
	UpdateResult,
	Repository,
	SaveOptions,
  } from 'typeorm';
  import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
  
  export interface PolymorphicInterface {
	entityId: string;
	entityType: string;
  }
  
  export type PolyMorphicType<K> = PolymorphicInterface & DeepPartial<K>;
  
  export const POLYMORPHIC_RELATIONSHIP = 'POLYMORPHIC_RELATIONSHIP';
  
  export interface PolymorphicOptions {
	type: Function;
	parent: Function;
	property: string | Symbol;
  }
  
  export const PolyMorphic = (type: Function): PropertyDecorator => (
	target: Object,
	propertyKey: string | Symbol,
  ): void =>
	Reflect.defineMetadata(
	  `${POLYMORPHIC_RELATIONSHIP}::${propertyKey}`,
	  {
		type,
		parent: target.constructor.name,
		property: propertyKey,
	  },
	  target,
	);
  
  export class PolymorphicRepository<T extends DeepPartial<T>> extends Repository<T> {
	private getMetadata(): Array<PolymorphicOptions> {
	  let keys = Reflect.getMetadataKeys((this.metadata.target as Function)['prototype']);
  
	  if (!Array.isArray(keys)) {
		return [];
	  }
  
	  keys = keys.filter((key: string) => {
		const parts = key.split('::');
		return parts[0] === POLYMORPHIC_RELATIONSHIP;
	  });
  
	  if (!keys) {
		return [];
	  }
  
	  return keys.map(
		(key: string): PolymorphicOptions =>
		  Reflect.getMetadata(key, (this.metadata.target as Function)['prototype']),
	  );
	}
  
	async find(findOptions?: FindConditions<T> | FindManyOptions<T>): Promise<T[]> {
	  const polymorphicMetadata = this.getMetadata();
  
	  if (Object.keys(polymorphicMetadata).length === 0) {
		return super.find(findOptions);
	  }
  
	  const entities = await super.find(findOptions);
  
	  return this.hydratePolymorphicEntities(entities);
	}
  
	public async hydratePolymorphicEntities(entities: Array<T>): Promise<Array<T>> {
	  const metadata = this.getMetadata();
  
	  metadata.forEach(
		async (data: PolymorphicOptions): Promise<void> => {
		  await Promise.all(
			entities.map(
			  async (entity: T): Promise<void> => {
				const repository = this.manager.getRepository(data.type);
				const property = data.property;
				const parent = data.parent;
  
				if (!repository) {
				  throw new Error(
					`Repository not found for type [${
					  data.type
					}] using property [${property}] on parent entity [${parent}]`,
				  );
				}
  
				const morphValues = await repository.find({
				  where: {
					//@ts-ignore
					entityId: entity.id, // TODO add type AbstractEntity
					entityType: this.metadata.targetName,
				  },
				});
  
				//@ts-ignore
				entity[property] = morphValues;
			  },
			),
		  );
		},
	  );
  
	  return entities;
	}
  
	public async update(
	  criteria:
		| string
		| string[]
		| number
		| number[]
		| Date
		| Date[]
		| ObjectID
		| ObjectID[]
		| FindConditions<T>,
	  partialEntity: QueryDeepPartialEntity<T>,
	): Promise<UpdateResult> {
	  const polymorphicMetadata = this.getMetadata();
	  if (Object.keys(polymorphicMetadata).length === 0) {
		return super.update(criteria, partialEntity);
	  }
  
	  const result = super.update(criteria, partialEntity);
  
	  // TODO update morphs
	  throw new Error("CBA I'm very tired");
  
	  return result;
	}
  
	public async save<E extends DeepPartial<T>>(
	  entity: E | Array<E>,
	  options?: SaveOptions & { reload: false },
	): Promise<E & T | Array<E & T>> {
	  const polymorphicMetadata = this.getMetadata();
  
	  if (Object.keys(polymorphicMetadata).length === 0) {
		return Array.isArray(entity) ? super.save(entity, options) : super.save(entity);
	  }
  
	  const result = Array.isArray(entity)
		? await super.save(entity, options)
		: await super.save(entity);
  
	  Array.isArray(result)
		? await Promise.all(result.map((res: T) => this.saveMorphs(res)))
		: await this.saveMorphs(result);
  
	  return result;
	}
  
	private async saveMorphs(entity: T): Promise<void> {
	  const metadata = this.getMetadata();
  
	  await Promise.all(
		metadata.map(
		  async (data: PolymorphicOptions): Promise<void> => {
			const repository: Repository<PolymorphicInterface> = this.manager.getRepository(
			  data.type,
			);
			const property = data.property;
			const parent = data.parent;
			const value: Partial<PolymorphicInterface> | Array<Partial<PolymorphicInterface>> =
			  //@ts-ignore
			  entity[property];
  
			if (typeof value === 'undefined' || value === undefined) {
			  return new Promise(resolve => resolve());
			}
  
			if (!repository) {
			  throw new Error(
				`Repository not found for type [${
				  data.type
				}] using property [${property}] on parent entity [${parent}]`,
			  );
			}
  
			let result: Array<any> | any;
  
			if (Array.isArray(value)) {
			  //@ts-ignore
			  result = await Promise.all(
				value.map(val => {
				  // @ts-ignore
				  val.entityId = entity.id;
				  val.entityType = this.metadata.targetName;
				  return repository.save(
					value instanceof data.type ? value : repository.create(value),
				  );
				}),
			  );
			} else {
			  // @ts-ignore
			  value.entityId = entity.id; // TODO resolve AbstractEntity for T
			  value.entityType = this.metadata.targetName;
  
			  result = await repository.save(
				value instanceof data.type ? value : repository.create(value),
			  );
			}
  
			// @ts-ignore
			entity[property] = result;
		  },
		),
	  );
	}
  }