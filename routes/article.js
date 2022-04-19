const express = require("express");
const Http = require("http");
const router = express.Router();
const Articles = require("../schemas/articles");
const Users = require("../schemas/users");
const Likes = require("../schemas/articleLikes");
const jwt = require("jsonwebtoken");
const { response } = require("express");
const moment = require("moment");
const authMiddleware = require("../middleware/authMiddleware");
const multipart = require("connect-multiparty"); // 사진data 핸들링 라이브러리
const imgMiddleware = multipart({
  uploadDir: "uploads",
});

router.use(express.json());
router.use(express.urlencoded({ extended: false }));

router.get("/", (req, res) => {
  res.send("/article 경로에 해당합니다");
});

//게시글 저장
router.post("/add", authMiddleware, imgMiddleware, async (req, res) => {
  try {
    const { articleTitle, articleContent, articlePrice } = req.body;
    console.log("이게 바디다!!!!!", req.body);
    const { userId, userNickname, userGu, userDong } = res.locals.userDB;
    console.log("res.locals.userDB:", res.locals.userDB);
    console.log(
      "이게 토큰에서 가져온 값이다!!!!!",
      userId,
      userNickname,
      userGu,
      userDong
    );
    const articleNumber = (await Articles.countDocuments()) + 1;
    const articleCreatedAt = moment().format("YYYY-MM-DD HH:mm:ss");
    // 게시글 이미지 받기
    const { path } = req.files.articleImageUrl;
    console.log("이게 이미지 경로다!!!!!", path);
    const articleImageUrl = path.replace("uploads", ""); // img파일의 경로(원본 img파일은 uploads폴더에 저장되고있음)
    const createArticles = await Articles.create({
      articleTitle,
      articleContent,
      articleImageUrl,
      articlePrice,
      userId,
      userNickname,
      userGu,
      userDong,
      articleNumber,
      articleCreatedAt,
    });
    res.status(200).json({ createArticles });
    console.log(createArticles);
  } catch (err) {
    res
      .status(400)
      .json({
        response: "fail",
        msg: "양식에 맞추어 모든 내용을 작성해주세요",
      });
  }
});

// (입력 값) articleTitle  articleContent  articleImageUrl articlePrice
//(헤더 토큰 값) userId  userNickname  userGu  userDong
//(server 지정 값) articleNumber  articleCreatedAt
//(DB 빼올 값) userImage

//게시글 삭제
router.delete("/delete/:articleNumber", authMiddleware, async (req, res) => {
  const articleNumber = req.params.articleNumber;
  const { userId } = res.locals.userDB;
  const existsArticles = await Articles.findOne({ articleNumber });
  const DBuserId = existsArticles.userId;
  if (userId == DBuserId) {
    await Articles.deleteOne({ articleNumber });
    console.log("정상적으로 삭제됨");
    res.json({ response: "success" });
    return;
  } else {
    res.json({ response: "유효하지 않은 토큰정보 입니다." });
  }
});

//게시글 수정
router.post("/edit/:articleNumber", authMiddleware, async (req, res) => {
  const { userId } = res.locals.userDB;
  const articleNumber = req.params.articleNumber;
  const { articleTitle, articleContent, articlePrice } = req.body;
  console.log(req.body);
  // 게시글 수정 이미지 받기
  const { path } = req.files.articleImageUrl;
  const articleImageUrl = path.replace("uploads", ""); // img파일의 경로(원본 img파일은 uploads폴더에 저장되고있음)
  const existsArticles = await Articles.findOne({ articleNumber });
  const DBuserId = existsArticles.userId;
  if (userId == DBuserId) {
    await Articles.updateOne({ articleNumber }, { $set: req.body });
    console.log({
      articleTitle,
      articleContent,
      articleImageUrl,
      articlePrice,
    });
    res.json({ response: "success", msg: "게시글 수정이 완료되었습니다" });
    return;
  }
  // else{ res.json({ response: "fail", msg: "양식에 맞추어 모든 내용을 작성해주세요" });
  // } // 한 부분 빠지더라도 바디에서 받아온 내역만 수정하여 오류 나지 않음
});

router.get("/edit/:articleNumber", authMiddleware, async (req, res) => {
  const { userId } = res.locals.userDB;
  const articleNumber = req.params.articleNumber;
  const existsArticles = await Articles.findOne({ articleNumber });
  const existsUsers = await Users.findOne({ userId });
  const userImage = existsUsers.userImage;
  console.log({ existsArticles, existsUsers, userImage });
  res.json({ existsArticles, userImage });
});

//조회

//사용자위치 기반  article
router.get("/list", authMiddleware, async (req, res) => {
  try {
    //유저위치기반  조회
    const  user = res.locals.userDB;
    if (user) {
      // 사용자 위치 정보
      const userGu = user.userGu;
      const userDong = user.userDong;
      console.log(userGu,userDong)
      //위치 정보 매칭
      const List = await Articles.aggregate([
        { $match: { userGu: userGu, userDong: userDong } },
        {
          $lookup: {
            from: "articlelike",
            localField: "articleNumber",
            foreignField: "articleNumber",
            as: "Like",
          },
        },
        {
          $project: {
            _id: 1,
            articleNumber: 1,
            userId: 1,
            userNickname: 1,
            userGu: 1,
            userDong: 1,
            articleCreatedAt: 1,
            articleImageUrl: 1,
            articlePrice: 1,
            likeCount: { $size: "$Like" },
          },
        },
      ])
        .sort("-articleCreatedAt")
        .exec();
      //위치 정보에일치하는 정보가 없을때
      if (Array.isArray(List) && List.length === 0) {
        return res.status(401).json({
          response: "fail",
          msg: "조건에 일치하는 게 없습니다",
        });
      }
      return res.status(200).json({
        List,
       /*  response:"success",
        msg:"조회 성공하셨습니다" */
    });
    }
      //검색기능
      const keyword = req.query.keyword;
      //검색어가 있는 지 확인
       if(keyword){
           //array생성
           let option = [];
           //조건문
           if (option) {
            //정규식(articleTitle키값은 밸류 req.qurey.item설정)
            option = [ { articleTitle: new RegExp(keyword) } ];
           } 
           //db에서 검색
           const Srech = await Articles.aggregate([
             //조건에 맞게 검색
               {$match: {$or:option,userGu:user.userGu,userDong:user.userDong}  
               },
               //db에 다른 컬렉션 연결
               { $lookup: {
                   from: 'articlelike',
                   localField:'articleNumber' ,
                   foreignField:'articleNumber',
                   as: 'Like'
               }}
               // 객체를 가공하여 보여 주고 싶은 것들만 보여줌
               ,{
               $project:{
               _id: 1,
               articleNumber: 1,
               userId: 1,
               userNickname: 1,
               userGu: 1,
               userDong: 1,
               articleCreatedAt: 1,
               articleImageUrl: 1,
               articlePrice: 1,
               likeCount: { $size: '$Like'}
              }}
           ]).
               sort("-articleCreatedAt")
               .exec();
              //검색 조건에 일치 하는 게 없을 때
               if(Array.isArray(Srech) && Srech.length === 0)  {
                   return res.status(401).json({
                       response:"fail",
                       msg: "조건에 일치하는 게 없습니다"
                   })
               }
               // 조건에 일치 시
               return res.status(200).json({
                   Srech,
                   response:"success",
                   msg:"조회 성공하셨습니다"
               });
      }
       throw error;
  }catch(error){
      res.status(400).json({
          response:"fail",
          msg: "로그인을 해주십시오"
      })
  }
});

//article 상세페이지
router.get("/detail/:articleNumber", authMiddleware, async (req, res) => {
  try {
    const { articleNumber } = req.params;
    console.log(articleNumber)
    const  user  = res.locals.userDB;
    //유저 정보확인
    if (user) {
      if (articleNumber) {
        //articleNumber가 일치하는 것
        const List = await Articles.find({ articleNumber });
        //List.userId가 같은 것만 가져옴
        const userImage = await Users.findOne({ userId: List.userId })
          .userImage;
        //좋아요 갯수
        const totalLike = (await Likes.find({ articleNumber })).length;
        return res.status(200).json({
          List,
          userImage,
          totalLike,
          response: "success",
        });
      }
      res.status(401).json({
        response: "fail",
        msg: "해당 페이지가 존재하지 않습니다",
      });
    }
  } catch (error) {
    res.status(401).json({
      response: "fail",
      msg: "토큰이 유효하지 않습니다.",
    });
  }
});

//좋아요 추가,삭제
router.post("/like", authMiddleware, async (req, res) => {
  try {
    //유저 정보 받기
    const  user  = res.locals.userDB;
    //articleNumber받는다
    const { articleNumber } = req.body;
    //유저 정보가 있는 지 확인
    if (user.length > 0) {
      //사용유자가 같은 상품에 좋아요를 했는지 확인
      const like = await Likes.find({ articleNumber, userId: user.userId });
      if (like) {
        //일치하는 갚은 있으면 삭제
        await Likes.deleteOne({ articleNumber, userId: user.userId });
        //남은 개수
        const totalLike = (await Likes.find({ articleNumber })).length;
        return res.status(200).json({ result: "success", totalLike });
      }
      // 일치 하는 값이 없을 시 생성
      await Likes.create({ articleNumber, userId: user.userId });
      // 총갯수
      const totalLike = (await Likes.find({ articleNumber })).length;
      return res.status(200).json({ result: "success", totalLike });
    }
    return res.status(401).json({
      response: "fail",
      msg: "유효하지 않은 토큰입니다",
    });
  } catch (error) {
    res.status(400).json({
      response: "fail",
      msg: "알수 없는 오류가 발생했습니다.",
    });
  }
});

module.exports = router;
