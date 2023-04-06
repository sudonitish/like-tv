type ModelDefaults<C> = C & {
  save(): Promise<ModelDefaults<C>>;
}

interface Model<C>{
  new(columns: C): ModelDefaults<C>;
  get(columns: Partial<C>): Promise<ModelDefaults<C>>;
}