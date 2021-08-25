import { createRefreshToken, createAccessToken } from './utils/auth';
import { MyContext } from './MyContext';
import { User } from './entity/User';
import {
  Arg,
  Mutation,
  Query,
  Resolver,
  ObjectType,
  Field,
  Ctx,
  UseMiddleware,
} from 'type-graphql';
import { compare, hash } from 'bcryptjs';
import { isAuth } from './middleware/isAuth';

@ObjectType()
class LoginResponse {
  @Field()
  accessToken: string;
}

@Resolver()
export class UserResolver {
  @Query(() => String!)
  hello() {
    return 'hi';
  }

  //   protected
  @UseMiddleware(isAuth)
  @Query(() => String)
  protected(@Ctx() { payload }: MyContext) {
    return `Your user id is ${payload?.userId}`;
  }

  @Query(() => [User])
  users() {
    return User.find();
  }

  @Mutation(() => Boolean)
  async register(
    @Arg('email') email: string,
    @Arg('password') password: string
  ) {
    try {
      const hashedPassword = await hash(password, 12);

      await User.insert({
        email,
        password: hashedPassword,
      });
    } catch (error) {
      console.error(error);
      return false;
    }

    return true;
  }

  @Mutation(() => LoginResponse)
  async login(
    @Arg('email') email: string,
    @Arg('password') password: string,
    @Ctx() { res }: MyContext
  ): Promise<LoginResponse> {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      throw Error('Cannot find user');
    }

    const valid = await compare(password, user.password);

    if (!valid) {
      throw Error('Bad password');
    }

    //   login successful

    // refreshtoken
    res.cookie('jid', createRefreshToken(user), { httpOnly: true });

    // accesstoken
    return {
      accessToken: createAccessToken(user),
    };
  }
}
