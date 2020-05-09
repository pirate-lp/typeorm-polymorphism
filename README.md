# TypeORM Polymorphism (feature)

The goal of this repository is to develop **Polymorphism** feature for [TypeORM](https://typeorm.io).

## Starting Point

The first iterestion is directly from the answer to: https://stackoverflow.com/questions/52995280/typeorm-polymorphic-relations on stack exchange.

## Road-map

- Version 0.1 | creating two basic features:
	- morphOne() : polymorphism from inside the same table
	- morphToMany() : polymorphism with a separate joint table
- Version 1.0 | creating full set of features:
	- morphOne()
	- morphMany() : morphOne but with possibility for more than one association
	- morphTO() : reverse of morphOne and morphMany
	- morphToMany() 
	- morphByMany() : reverse of morphToMany

## Why

**developers migrating from ActiveRecord (ruby) and Laravel Eloquent (PHP) who use Polymorphism in their model architectures are disparate for such a feature!**

### Answering Frequent Counter-Argument

There are some programmers who are vehemently against "polymorphism" because this level of functionalities break away from the standard built-in feature shipped by standard Relational databases. However, this functionality is nothing unusual for graph based databases.

So, though some wish to bran it as "anti-pattern", in reality, ORM-s are not meant to be married with relational databases, and the reason we use this pattern is as a temporary measure till graph based databases become more mature, more wide-spread and etc.

While it is fine to avoid a feature/design such a polymorphic relationships between the models in your app/library, just because open-source relational databases don't ship a foreign-key constraint check by default for graph-like patterns, doesn't mean graph-like patterns are sins!