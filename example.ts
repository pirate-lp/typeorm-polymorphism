@Entity()
export class TestEntity {
  @PolyMorphic(SomeOtherEntity)
  property: SomeOtherEntity[];
}